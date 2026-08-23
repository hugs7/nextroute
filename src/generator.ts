/**
 * Code generator for route files
 */

import { camelCase, snakeCase } from "lodash-es";
import { dirname, isAbsolute, relative, resolve } from "path";
import prettier from "prettier";
import { Project, VariableDeclarationKind, WriterFunction, Writers } from "ts-morph";

import { defaultConfig } from "@/config";
import { PACKAGE_NAME, PRETTIER_DEFAULT_CONFIG, RUNTIME_SUBMODULE } from "@/constants";
import { RouteNode } from "@/runtime";
import { isMetadataKey } from "@/runtime/runtime";
import { RouteContractReference } from "@/scanner";
import { pascalCase, wrapDoubleQuotes } from "@/string";
import { RouteConfig } from "@/types";

/**
 * Convert RouteNode structure to ts-morph object literal writer
 */
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

type ContractTree = {
  contract?: RouteContractReference;
  children: Record<string, ContractTree>;
};

const createContractTree = (contracts: RouteContractReference[]): ContractTree => {
  const root: ContractTree = { children: {} };

  for (const contract of contracts) {
    let node = root;
    for (const segment of contract.segments) {
      node.children[segment] ??= { children: {} };
      node = node.children[segment];
    }
    node.contract = contract;
  }

  return root;
};

const getContractModuleSpecifier = (contract: RouteContractReference, outputPath: string): string => {
  const reference = contract.moduleSpecifier ?? contract.filePath;
  if (!isAbsolute(reference)) return reference;

  const path = relative(dirname(resolve(outputPath)), reference)
    .replace(/\\/g, "/")
    .replace(/\.(?:js|jsx|ts|tsx)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
};

const createContractTypeWriter =
  (tree: ContractTree, outputPath: string): WriterFunction =>
  (writer) => {
    writer.block(() => {
      if (tree.contract) {
        const moduleSpecifier = getContractModuleSpecifier(tree.contract, outputPath);
        writer.writeLine(
          `readonly $$contract: typeof import(${wrapDoubleQuotes(moduleSpecifier)})[${wrapDoubleQuotes(tree.contract.exportName)}];`,
        );
      }

      for (const [key, child] of Object.entries(tree.children)) {
        const safeKey = /[^a-zA-Z0-9_$]/.test(key) ? wrapDoubleQuotes(key) : key;
        writer.write(`readonly ${safeKey}: `);
        createContractTypeWriter(child, outputPath)(writer);
        writer.writeLine(";");
      }
    });
  };

/**
 * Generate complete route file content using ts-morph
 */
export const generateRouteFile = async (
  structure: RouteNode,
  config: RouteConfig,
  contracts: RouteContractReference[] = [],
): Promise<string> => {
  const localContract = contracts.find((contract) => !contract.portable);
  if (config.portable && localContract) {
    throw new Error(
      `Portable output cannot reference inline route contract: ${localContract.filePath}. Re-export routeContract from a shared publishable module.`,
    );
  }

  const basePrefix = config.basePrefix ?? "";
  const routesName = config.routesName ?? defaultConfig.routesName;
  const compiledRoutesName = snakeCase(routesName).toUpperCase();
  const typeName = pascalCase(routesName);
  const structureName = [camelCase(typeName), "Structure"].join("");
  const contractsName = [camelCase(typeName), "Contracts"].join("");
  const paramTypeMapType = config.paramTypeMap ? config.paramTypeMap.type : "{}";

  // Create in-memory TypeScript project
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("routes.ts");

  // Add runtime imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: [PACKAGE_NAME, RUNTIME_SUBMODULE].join("/"),
    namedImports: ["createRouteBuilder", "RouteBuilderObject"],
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
    leadingTrivia: "\n// Type-only route contract map\n",
    name: contractsName,
    type: createContractTypeWriter(createContractTree(contracts), config.output),
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
