import type { RouteConfig } from "../src";

const config: RouteConfig[] = [
  {
    input: "./test/app/api",
    output: "./test/generated/routes.ts",
    watch: false,
    basePrefix: "/api",
    paramTypeMap: {
      type: "RouteParamTypeMap",
      from: "../params",
    },
  },
  {
    contractMode: "external",
    input: "./test/app/api",
    output: "./test/generated/external-routes.ts",
    routesName: "externalRoutes",
    watch: false,
    basePrefix: "/api",
  },
];

export default config;
