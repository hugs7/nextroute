/**
 * Code generator for route files
 */

import { camelCase, snakeCase } from "lodash-es";
import { dirname, isAbsolute, relative, resolve, sep } from "path";
import prettier from "prettier";
import { Project, VariableDeclarationKind, WriterFunction, Writers } from "ts-morph";

import { defaultConfig } from "@/config";
import { PACKAGE_NAME, PRETTIER_DEFAULT_CONFIG, RUNTIME_SUBMODULE } from "@/constants";
import { RouteNode } from "@/runtime";
import { isMetadataKey } from "@/runtime/runtime";
import type { RouteContractReference } from "@/scanner";
import { pascalCase, wrapDoubleQuotes } from "@/string";
import { ContractMode, RouteConfig } from "@/types";

/**
 * Convert RouteNode structure to ts-morph object literal writer
 */
type ContractTree = {
  contractType?: string;
  children: Record<string, ContractTree>;
};

const createObjectWriter = (structure: RouteNode): WriterFunction => {
  return Writers.object(
    Object.entries(structure)
      .sort(([a], [b]) => {
        // Sort to put metadata keys first
        const aOrder = isMetadataKey(a) ? 0 : 1;
        const bOrder = isMetadataKey(b) ? 0 : 1;
        return aOrder - bOrder;
      })
      .reduce(
        (acc, [key, value]) => {
          // Check if key needs to be quoted (contains special characters)
          const needsQuotes = /[^a-zA-Z0-9_$]/.test(key);
          const safeKey = needsQuotes ? wrapDoubleQuotes(key) : key;

          switch (typeof value) {
            case "object":
              if (value !== null) {
                acc[safeKey] = createObjectWriter(value);
              }
              break;
            case "string":
              acc[safeKey] = wrapDoubleQuotes(value);
              break;
            case "boolean":
            case "number":
            default:
              acc[safeKey] = String(value);
              break;
          }

          return acc;
        },
        {} as Record<string, string | WriterFunction>,
      ),
  );
};

const createContractTree = (contracts: { contractType: string; segments: string[] }[]): ContractTree => {
  const root: ContractTree = { children: {} };

  for (const contract of contracts) {
    let node = root;
    for (const segment of contract.segments) {
      node.children[segment] ??= { children: {} };
      node = node.children[segment];
    }
    node.contractType = contract.contractType;
  }

  return root;
};

const typeProperty = (key: string): string => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));

const contractTreeType = (tree: ContractTree): string => {
  const fields = Object.entries(tree.children).map(
    ([key, child]) => `readonly ${typeProperty(key)}: ${contractTreeType(child)};`,
  );
  if (tree.contractType) fields.unshift(`readonly $$contract: ${tree.contractType};`);
  return `{ ${fields.join(" ")} }`;
};

const moduleSpecifier = (outputPath: string, sourcePath: string): string => {
  const path = relative(dirname(resolve(outputPath)), sourcePath)
    .replace(/\\/g, "/")
    .replace(/\.(?:js|jsx|ts|tsx)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
};

const inferNextProjectRoot = (input: string): string => {
  const resolvedInput = resolve(input);
  const segments = resolvedInput.split(sep);
  const appIndex = segments.lastIndexOf("app");
  if (appIndex < 0) return dirname(resolvedInput);
  const rootIndex = segments[appIndex - 1] === "src" ? appIndex - 1 : appIndex;
  return segments.slice(0, rootIndex).join(sep) || sep;
};

export const resolveContractMode = (config: RouteConfig): Exclude<ContractMode, "auto"> => {
  if (config.contractMode && config.contractMode !== "auto") return config.contractMode;
  const outputFromRoot = relative(inferNextProjectRoot(config.input), resolve(config.output));
  return outputFromRoot.startsWith("..") || isAbsolute(outputFromRoot) ? "external" : "internal";
};

const schemaName = (contractIndex: number, method: string, suffix: string): string =>
  `routeContract${contractIndex}${pascalCase(method)}${suffix}Schema`;

/**
 * Generate complete route file content using ts-morph
 */
export const generateRouteFile = async (
  structure: RouteNode,
  config: RouteConfig,
  contracts: RouteContractReference[] = [],
): Promise<string> => {
  const includedContracts = config.contracts === false ? [] : contracts;
  const basePrefix = config.basePrefix ?? "";
  const routesName = config.routesName ?? defaultConfig.routesName;
  const compiledRoutesName = snakeCase(routesName).toUpperCase();
  const typeName = pascalCase(routesName);
  const structureName = [camelCase(typeName), "Structure"].join("");
  const contractsName = [camelCase(typeName), "Contracts"].join("");
  const paramTypeMapType = config.paramTypeMap ? config.paramTypeMap.type : "{}";
  const contractMode = resolveContractMode(config);

  // Create in-memory TypeScript project
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("routes.ts");

  // Add runtime imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: [PACKAGE_NAME, RUNTIME_SUBMODULE].join("/"),
    namedImports: ["createRouteBuilder", "RouteBuilderObject"],
  });

  const contractTypes: { contractType: string; segments: string[] }[] = [];
  if (includedContracts.length > 0 && contractMode === "external") {
    sourceFile.addImportDeclaration({ moduleSpecifier: "zod", namedImports: ["z"] });
  }

  includedContracts.forEach((contract, contractIndex) => {
    if (contractMode === "internal") {
      const alias = `routeContract${contractIndex}`;
      sourceFile.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: moduleSpecifier(config.output, contract.sourcePath),
        namedImports: [{ alias, name: "routeContract" }],
      });
      contractTypes.push({ contractType: `typeof ${alias}`, segments: contract.segments });
      return;
    }

    const methodTypes = contract.methods.map(({ method, requestSchema, responses }) => {
      const requestName = schemaName(contractIndex, method, "Request");
      sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{ initializer: requestSchema, name: requestName }],
      });
      const responseTypes = responses.map(({ schema, status }) => {
        const responseName = schemaName(contractIndex, method, `Response${status}`);
        sourceFile.addVariableStatement({
          declarationKind: VariableDeclarationKind.Const,
          declarations: [{ initializer: schema, name: responseName }],
        });
        return `readonly ${status}: z.infer<typeof ${responseName}>;`;
      });
      return `readonly ${method}: { readonly request: z.infer<typeof ${requestName}>; readonly responses: { ${responseTypes.join(" ")} }; };`;
    });
    contractTypes.push({ contractType: `{ ${methodTypes.join(" ")} }`, segments: contract.segments });
  });

  // Add paramTypeMap import if configured
  if (config.paramTypeMap) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: config.paramTypeMap.from,
      namedImports: [{ name: config.paramTypeMap.type, isTypeOnly: true }],
    });
  }

  // Add custom imports if provided
  if (config.imports && config.imports.length > 0) {
    for (const customImport of config.imports) {
      sourceFile.addStatements(customImport);
    }
  }

  // Add route structure constant
  sourceFile.addVariableStatement({
    leadingTrivia: "// Route structure definition\n",
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: structureName,
        initializer: (writer) => {
          createObjectWriter(structure)(writer);
          writer.write(" as const");
        },
      },
    ],
  });

  sourceFile.addTypeAlias({
    leadingTrivia: "\n// Type-only route contracts\n",
    name: contractsName,
    type: contractTreeType(createContractTree(contractTypes)),
  });

  // Add type export
  sourceFile.addTypeAlias({
    leadingTrivia: "\n// Type-safe route builder with parameter types\n",
    isExported: true,
    name: typeName,
    type: `RouteBuilderObject<typeof ${structureName}, ${paramTypeMapType}, ${contractsName}>`,
  });

  // Add route builder instance
  sourceFile.addVariableStatement({
    leadingTrivia: "\n// Route builder instance\n",
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: compiledRoutesName,
        initializer: `createRouteBuilder<typeof ${structureName}, ${paramTypeMapType}, ${contractsName}>(${structureName}, [], "${basePrefix}")`,
      },
    ],
  });

  const code = sourceFile.getFullText();

  // Load prettier config from the consuming project, fallback to defaults
  const prettierConfig = (await prettier.resolveConfig(config.output)) || PRETTIER_DEFAULT_CONFIG;

  // Add header comment and format with prettier
  const formattedCode = await prettier.format(code, {
    ...prettierConfig,
    parser: "typescript",
  });

  const header = `/**
 * Auto-generated Next.js route builder
 * Generated from: ${config.input}
 *
 * DO NOT EDIT THIS FILE MANUALLY - it will be regenerated
 */

`;

  return header + formattedCode;
};
