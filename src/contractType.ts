import { dirname, relative } from "path";
import { Project, SourceFile, TypeFormatFlags } from "ts-morph";

const HTTP_METHODS = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);
const TYPE_FORMAT_FLAGS = TypeFormatFlags.InTypeAlias | TypeFormatFlags.NoTruncation;

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

const getTypeText = (sourceFile: SourceFile, aliasName: string): string => {
  const declaration = sourceFile.getTypeAliasOrThrow(aliasName);
  const text = declaration.getType().getText(declaration, TYPE_FORMAT_FLAGS);
  if (/\b(?:typeof\s+)?import\s*\(/.test(text)) {
    throw new Error(`${aliasName} could not be emitted as a self-contained type: ${text}`);
  }
  return text;
};

export const resolveRouteContractType = (project: Project, routeSourceFile: SourceFile): string => {
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
    const methodTypes = methods.map((method) => {
      const methodName = method.getName();
      const methodType = method.getTypeAtLocation(routeSourceFile);
      const responses = methodType.getPropertyOrThrow("responses").getTypeAtLocation(routeSourceFile);
      const responseTypes = responses
        .getProperties()
        .map(
          (response) =>
            `readonly ${response.getName()}: ${getTypeText(helperSource, `Response_${methodName}_${response.getName()}`)};`,
        )
        .join("\n");

      return `readonly ${methodName}: {
        readonly request: ${getTypeText(helperSource, `Request_${methodName}`)};
        readonly responses: {
          ${responseTypes}
        };
      };`;
    });

    return `{
      ${methodTypes.join("\n")}
    }`;
  } finally {
    project.removeSourceFile(helperSource);
  }
};
