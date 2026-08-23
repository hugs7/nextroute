import type { z } from "zod";

import { RouteInput, RouteMethodContract, RouteRequestSchemas } from "./types";

type MultiValueInput<Value> = {
  getAll(key: string): Value[];
  keys(): Iterable<string>;
};

export type ContractRequest = {
  body?: unknown;
  formData(): Promise<MultiValueInput<unknown>>;
  json(): Promise<unknown>;
  url: string;
};

export type ContractRouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

const getMultiValueInput = <Value>(source: MultiValueInput<Value>): Record<string, Value | Value[]> => {
  const input: Record<string, Value | Value[]> = {};

  for (const key of new Set(source.keys())) {
    const values = source.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  }

  return input;
};

const omitEmptyOptionalInput = (schema: z.ZodType, value: unknown): unknown => {
  const isEmptyRecord = typeof value === "object" && value !== null && Object.keys(value).length === 0;
  return isEmptyRecord && schema.safeParse(undefined).success ? undefined : value;
};

/**
 * Parses request input using a method contract without imposing a middleware stack.
 *
 * @param contract - Method contract containing request schemas.
 * @param request - Web-compatible request.
 * @param context - App Router context containing path parameters.
 * @returns Parsed Zod output keyed by configured request sources.
 */
export const parseRouteRequest = async <Contract extends RouteMethodContract>(
  contract: Contract,
  request: ContractRequest,
  context: ContractRouteContext,
): Promise<RouteInput<Contract>> => {
  const values: Partial<Record<keyof RouteRequestSchemas, unknown>> = {};

  if (contract.params) values.params = omitEmptyOptionalInput(contract.params, await context.params);
  if (contract.query) {
    values.query = omitEmptyOptionalInput(contract.query, getMultiValueInput(new URL(request.url).searchParams));
  }
  if (contract.body) {
    values.body = request.body == null && contract.body.safeParse(undefined).success ? undefined : await request.json();
  }
  if (contract.formData) {
    const formData = request.body == null ? {} : getMultiValueInput(await request.formData());
    values.formData = omitEmptyOptionalInput(contract.formData, formData);
  }

  const input: Partial<Record<keyof RouteRequestSchemas, unknown>> = {};
  for (const source of ["params", "query", "body", "formData"] as const) {
    const schema = contract[source];
    if (schema) input[source] = schema.parse(values[source]);
  }

  return input as RouteInput<Contract>;
};
