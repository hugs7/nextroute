import type { HttpMethod } from "../contracts";

const HTTP_METHODS = new Set<HttpMethod>(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

export type RouteApiRequest = (
  route: string,
  method: HttpMethod,
  options?: Readonly<Record<string, unknown>>,
) => unknown;

const isHttpMethod = (property: PropertyKey): property is HttpMethod =>
  typeof property === "string" && HTTP_METHODS.has(property as HttpMethod);

const createEndpointProxy = (route: string, request: RouteApiRequest): object =>
  new Proxy(
    {},
    {
      get: (_target, property) =>
        isHttpMethod(property)
          ? (options?: Readonly<Record<string, unknown>>) => request(route, property, options)
          : undefined,
    },
  );

const wrapRouteResult = (result: unknown, request: RouteApiRequest): object => {
  if (typeof result === "string") return createEndpointProxy(result, request);
  if (typeof result === "object" && result !== null) return createNodeProxy(result, request);
  throw new TypeError("Route builders must return a path or another route node");
};

const createNodeProxy = (node: object, request: RouteApiRequest): object =>
  new Proxy(node, {
    get: (target, property, receiver) => {
      if (isHttpMethod(property)) {
        const selfRoute = Reflect.get(target, "$", receiver);
        if (typeof selfRoute !== "function") return undefined;
        return Reflect.get(createEndpointProxy(selfRoute(), request), property);
      }

      const child = Reflect.get(target, property, receiver) as unknown;
      if (typeof child === "function") {
        if (typeof property === "string" && property.startsWith("$")) {
          return (...args: readonly unknown[]) => wrapRouteResult(child(...args), request);
        }
        return wrapRouteResult(child(), request);
      }
      if (typeof child === "object" && child !== null) return createNodeProxy(child, request);
      return child;
    },
  });

export const createRouteApiProxy = (routes: object, request: RouteApiRequest): object =>
  createNodeProxy(routes, request);
