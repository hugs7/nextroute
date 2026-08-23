export type ParamTypeMap = {
  /** The name of the type to import */
  type: string;
  /** The module path to import from */
  from: string;
};

export type ContractMode = "auto" | "external" | "internal";

/**
 * Configuration options for route generation
 */
export interface RouteConfig {
  /** Input directory to scan (e.g., "./app/api") */
  input: string;
  /** Output file path for generated routes */
  output: string;
  /** Watch for changes and regenerate */
  watch?: boolean;
  /**
   * Base prefix for all routes
   * Defaults to the input path relative to ./app.
   * For example, if input is "./app/api", the default basePrefix will be "/api".
   *
   * As a fallback, "/" is used if the input path cannot be parsed.
   */
  basePrefix?: string;
  /**
   * Parameter type map configuration
   * Allows importing a type that defines parameter types
   * @example
   * { type: "MyParamTypes", from: "./types" }
   */
  paramTypeMap?: ParamTypeMap;
  /** Name for the generated routes constant (defaults to "routes") */
  routesName?: string;
  /** Discover route contracts and include them in generated output (defaults to true) */
  contracts?: boolean;
  /**
   * How generated contracts reference route schemas.
   * Internal output imports route contracts; external output emits standalone Zod schemas.
   * Auto detects whether output is inside the Next.js project (defaults to "auto").
   */
  contractMode?: ContractMode;
  /** Additional imports to include in generated file */
  imports?: string[];
}
