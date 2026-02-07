/**
 * Configuration loader using cosmiconfig
 */

import { cosmiconfig } from "cosmiconfig";

import { RouteConfig } from "./types";
import { DEFAULT_INPUT_DIR, DEFAULT_OUTPUT_FILE, DEFAULT_BASE_PREFIX, CONFIG_MODULE_NAME } from "./constants";

const explorer = cosmiconfig(CONFIG_MODULE_NAME);

/**
 * Default configuration
 */
export const defaultConfig: RouteConfig = {
  input: DEFAULT_INPUT_DIR,
  output: DEFAULT_OUTPUT_FILE,
  watch: false,
  basePrefix: DEFAULT_BASE_PREFIX,
  paramTypes: {},
};

/**
 * Load configuration from file or use defaults
 */
export const loadConfig = async (configPath?: string): Promise<RouteConfig> => {
  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search();

    if (result && result.config) {
      return {
        ...defaultConfig,
        ...result.config,
      };
    }
  } catch (error) {
    // Config file not found or invalid, use defaults
    console.warn("No config file found, using defaults");
  }

  return defaultConfig;
};

/**
 * Merge config with CLI options
 */
export const mergeConfig = (baseConfig: RouteConfig, options: Partial<RouteConfig>): RouteConfig => {
  return {
    ...baseConfig,
    ...Object.fromEntries(Object.entries(options).filter(([_, v]) => v !== undefined)),
  };
};
