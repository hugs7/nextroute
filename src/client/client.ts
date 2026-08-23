import type { RouteClient, RouteClientOptions, RouteTransportRequest } from "./types";
import type { HttpMethod } from "../contracts";

import { serializeQuery as defaultSerializeQuery } from "./query";

const appendQuery = (url: string, query: string): string => {
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
};

/**
 * Creates a contract-aware client around an application-owned transport.
 *
 * @param options - Transport and optional query serializer.
 * @returns A client whose route controls method, request, and response types.
 */
export const createRouteClient = ({
  serializeQuery = defaultSerializeQuery,
  transport,
}: RouteClientOptions): RouteClient => {
  const request = async (route: string, method: HttpMethod, options: Record<string, unknown> = {}) => {
    const { body, formData, headers, query, signal } = options;
    const request: RouteTransportRequest = {
      body,
      formData,
      headers: headers as Readonly<Record<string, string>> | undefined,
      method,
      signal,
      url: appendQuery(route, serializeQuery(query)),
    };

    return transport(request);
  };

  return { request } as RouteClient;
};
