import type { RouteApi } from "./routeApi.types";
import type { RouteClient } from "./types";

import { createRouteApiProxy, RouteApiRequest } from "./routeApiProxy";

/**
 * Adds contract-declared HTTP methods to a generated route tree.
 *
 * @param routes - Generated route builder.
 * @param client - Contract-aware client used for requests.
 * @returns A chainable API containing the methods declared by each route contract.
 */
export const createRouteApi = <Routes extends object>(routes: Routes, client: RouteClient): RouteApi<Routes> => {
  const request = client.request as unknown as RouteApiRequest;
  return createRouteApiProxy(routes, request) as RouteApi<Routes>;
};
