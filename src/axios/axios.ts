import type { AxiosInstance, AxiosRequestConfig } from "axios";

import type { AxiosRouteApi } from "./types";
import type { HttpMethod } from "../contracts";

import { createRouteApiProxy } from "../client/routeApiProxy";

type RuntimeRequestOptions = {
  body?: unknown;
  config?: AxiosRequestConfig<unknown>;
  formData?: unknown;
  query?: unknown;
};

/**
 * Creates a contract-aware, chainable API backed by an Axios instance.
 *
 * @param routes - Generated route builder.
 * @param axios - Application-owned Axios instance, including its interceptors and defaults.
 * @returns An API whose methods, inputs, and successful responses derive from each route contract.
 */
export const createAxiosRouteApi = <Routes extends object>(
  routes: Routes,
  axios: AxiosInstance,
): AxiosRouteApi<Routes> => {
  const request = (route: string, method: HttpMethod, options: Readonly<Record<string, unknown>> = {}) => {
    const { body, config, formData, query } = options as RuntimeRequestOptions;
    return axios.request({
      ...config,
      data: formData ?? body,
      method,
      params: query,
      url: route,
    });
  };

  return createRouteApiProxy(routes, request) as AxiosRouteApi<Routes>;
};
