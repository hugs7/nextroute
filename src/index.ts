/**
 * Main entry point for the package
 */

export { defaultConfig, loadConfig, mergeConfig } from "@/config";
export { CLI_NAME, CONFIG_FILE_NAME, CONFIG_MODULE_NAME, PACKAGE_NAME, PACKAGE_VERSION } from "@/constants";
export { generateRouteFile } from "@/generator";
export type {
  GetParamType,
  HasChildren,
  RouteBuilder,
  RouteBuilderObject,
  RouteContractOf,
  RouteNode,
  TypedRoute,
} from "@/runtime/types";
export { generateRouteManifest, generateRouteStructure, scanDirectory } from "@/scanner";
export type { RouteContractReference, RouteManifest } from "@/scanner";
export type { ContractMode, ParamTypeMap, RouteConfig } from "@/types";
export { startWatcher } from "@/watcher";
export type { RegenerateCallback } from "@/watcher";
