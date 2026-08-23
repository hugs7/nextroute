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

export const resolveRouteContractSchemas = (project: Project, routeSourceFile: SourceFile): ResolvedRouteContract => {
  const contractSymbol = routeSourceFile.getExportSymbols().find((symbol) => symbol.getName() === "routeContract");
  if (!contractSymbol) throw new Error(`${routeSourceFile.getFilePath()} does not export routeContract`);

  const contractType = contractSymbol.getTypeAtLocation(routeSourceFile);
  const methods = contractType.getProperties().filter((symbol) => HTTP_METHODS.has(symbol.getName()));
  const helperPath = `${routeSourceFile.getFilePath()}.next-typed-paths.ts`;
  const routeModule = getModuleSpecifier(helperPath, routeSourceFile.getFilePath());
  const aliases: string[] = [];

  for (const method of methods) {
    const methodName = method.getName();
    aliases.push(`type Request_${methodName} = ResolvedRequest<typeof contract.${methodName}>;`);
    const methodType = method.getTypeAtLocation(routeSourceFile);
    const responses = methodType.getPropertyOrThrow("responses").getTypeAtLocation(routeSourceFile);
    for (const response of responses.getProperties()) {
      aliases.push(
        `type Response_${methodName}_${response.getName()} = ResolvedResponse<typeof contract.${methodName}, ${response.getName()}>;`,
      );
    }
  }

  const helperSource = project.createSourceFile(
    helperPath,
    `import { routeContract as contract } from ${JSON.stringify(routeModule)};\n${TYPE_HELPERS}\n${aliases.join("\n")}`,
    { overwrite: true },
  );

  try {
    const resolvedMethods: ResolvedContractMethod[] = [];
    methods.forEach((method) => {
      const methodName = method.getName();
      const methodType = method.getTypeAtLocation(routeSourceFile);
      const responses = methodType.getPropertyOrThrow("responses").getTypeAtLocation(routeSourceFile);
      const requestDeclaration = helperSource.getTypeAliasOrThrow(`Request_${methodName}`);
      const resolvedResponses: ResolvedContractMethod["responses"] = [];
      responses.getProperties().forEach((response) => {
        const aliasName = `Response_${methodName}_${response.getName()}`;
        const declaration = helperSource.getTypeAliasOrThrow(aliasName);
        resolvedResponses.push({
          schema: typeToZodSchema(declaration.getType(), declaration),
          status: response.getName(),
        });
      });

      resolvedMethods.push({
        method: methodName,
        requestSchema: typeToZodSchema(requestDeclaration.getType(), requestDeclaration),
        responses: resolvedResponses,
      });
    });

    return { methods: resolvedMethods };
  } finally {
    project.removeSourceFile(helperSource);
  }
};
