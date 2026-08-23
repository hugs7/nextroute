import type { RouteTransport } from "./types";

type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>;

/**
 * Creates a route transport backed by the Fetch API.
 *
 * @param fetcher - Fetch implementation, injectable for server runtimes and tests.
 * @returns A transport for createRouteClient.
 */
export const createFetchTransport = (fetcher: typeof fetch = globalThis.fetch): RouteTransport => {
  return async ({ body, formData, headers: suppliedHeaders, method, signal, url }) => {
    const headers = new Headers(suppliedHeaders);
    if (body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");

    const response = await fetcher(url, {
      body: (formData ?? (body === undefined ? undefined : JSON.stringify(body))) as FetchOptions["body"],
      headers,
      method,
      signal: signal as FetchOptions["signal"],
    });

    const contentType = response.headers.get("content-type");
    const data =
      response.status === 204
        ? undefined
        : contentType?.includes("application/json")
          ? await response.json()
          : await response.text();

    return { data, status: response.status };
  };
};
