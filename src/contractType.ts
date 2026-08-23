import { dirname, relative } from "path";
import { Project, SourceFile } from "ts-morph";

import { typeToZodSchema } from "@/zodSchema";

const HTTP_METHODS = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

const TYPE_HELPERS = `
import type { z } from "zod";

type RequestSchemaKey = "body" | "formData" | "params" | "query";
type SchemaAt<Contract, Key extends RequestSchemaKey> =
  Contract extends Record<Key, infer Schema extends z.ZodType> ? Schema : never;
type ConfiguredRequestKey<Contract> = {
  [Key in RequestSchemaKey]: Contract extends Record<Key, z.ZodType> ? Key : never;
}[RequestSchemaKey];
type OptionalInputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.input<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];
type Simplify<Value> = { [Key in keyof Value]: Value[Key] };
type ResolvedRequest<Contract> = Simplify<
  {
    [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalInputKey<Contract>>]: z.input<SchemaAt<Contract, Key>>;
  } & {
    [Key in OptionalInputKey<Contract>]?: z.input<SchemaAt<Contract, Key>>;
  }
>;
type ResolvedResponse<Contract, Status extends PropertyKey> = Contract extends { responses: infer Responses }
  ? Status extends keyof Responses
    ? Responses[Status] extends { contentType: "application/json"; schema: infer Schema extends z.ZodType }
      ? z.output<Schema>
      : undefined
    : never
  : never;
`;

const getModuleSpecifier = (fromPath: string, toPath: string): string => {
  const path = relative(dirname(fromPath), toPath)
    .replace(/\\/g, "/")
    .replace(/\.(?:js|jsx|ts|tsx)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
};

export type ResolvedContractMethod = {
  method: string;
  requestSchema: string;
  responses: { schema: string; status: string }[];
};

export type ResolvedRouteContract = {
  methods: ResolvedContractMethod[];
};

type PreparedContract = {
  methods: {
    method: string;
    requestAlias: string;
    responses: { alias: string; status: string }[];
  }[];
  sourceFile: SourceFile;
};

export const resolveRouteContractsSchemas = (
  project: Project,
  routeSourceFiles: SourceFile[],
): ResolvedRouteContract[] => {
  if (routeSourceFiles.length === 0) return [];

  const helperPath = `${routeSourceFiles[0]!.getFilePath()}.next-typed-paths.ts`;
  const imports: string[] = [];
  const aliases: string[] = [];
  const preparedContracts: PreparedContract[] = [];

  routeSourceFiles.forEach((routeSourceFile, contractIndex) => {
    const contractSymbol = routeSourceFile.getExportSymbols().find((symbol) => symbol.getName() === "routeContract");
    if (!contractSymbol) throw new Error(`${routeSourceFile.getFilePath()} does not export routeContract`);

    const contractName = `contract_${contractIndex}`;
    imports.push(
      `import { routeContract as ${contractName} } from ${JSON.stringify(getModuleSpecifier(helperPath, routeSourceFile.getFilePath()))};`,
    );
    const contractType = contractSymbol.getTypeAtLocation(routeSourceFile);
    const methods = contractType.getProperties().filter((symbol) => HTTP_METHODS.has(symbol.getName()));
    const preparedMethods: PreparedContract["methods"] = [];
    for (const method of methods) {
      const methodName = method.getName();
      const requestAlias = `Request_${contractIndex}_${methodName}`;
      aliases.push(`type ${requestAlias} = ResolvedRequest<typeof ${contractName}.${methodName}>;`);
      const methodType = method.getTypeAtLocation(routeSourceFile);
      const responses = methodType.getPropertyOrThrow("responses").getTypeAtLocation(routeSourceFile);
      const preparedResponses = responses.getProperties().map((response) => {
        const status = response.getName();
        const alias = `Response_${contractIndex}_${methodName}_${status}`;
        aliases.push(`type ${alias} = ResolvedResponse<typeof ${contractName}.${methodName}, ${status}>;`);
        return { alias, status };
      });
      preparedMethods.push({ method: methodName, requestAlias, responses: preparedResponses });
    }
    preparedContracts.push({ methods: preparedMethods, sourceFile: routeSourceFile });
  });

  const helperSource = project.createSourceFile(
    helperPath,
    `${imports.join("\n")}\n${TYPE_HELPERS}\n${aliases.join("\n")}`,
    { overwrite: true },
  );

  try {
    return preparedContracts.map(({ methods, sourceFile }) => {
      try {
        return {
          methods: methods.map(({ method, requestAlias, responses }) => {
            const requestDeclaration = helperSource.getTypeAliasOrThrow(requestAlias);
            return {
              method,
              requestSchema: typeToZodSchema(requestDeclaration.getType(), requestDeclaration),
              responses: responses.map(({ alias, status }) => {
                const declaration = helperSource.getTypeAliasOrThrow(alias);
                return { schema: typeToZodSchema(declaration.getType(), declaration), status };
              }),
            };
          }),
        };
      } catch (error) {
        throw new Error(`Failed to resolve route contract in ${sourceFile.getFilePath()}`, { cause: error });
      }
    });
  } finally {
    project.removeSourceFile(helperSource);
  }
};

export const resolveRouteContractSchemas = (project: Project, routeSourceFile: SourceFile): ResolvedRouteContract =>
  resolveRouteContractsSchemas(project, [routeSourceFile])[0]!;
