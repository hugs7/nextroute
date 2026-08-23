import { RouteInput, RouteMethodContract, RouteRequestSchemas } from "./types";

type MultiValueInput<Value> = {
  getAll(key: string): Value[];
  keys(): Iterable<string>;
};

export type ContractRequest = {
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

  if (contract.params) values.params = await context.params;
  if (contract.query) values.query = getMultiValueInput(new URL(request.url).searchParams);
  if (contract.body) values.body = await request.json();
  if (contract.formData) values.formData = getMultiValueInput(await request.formData());

  const input: Partial<Record<keyof RouteRequestSchemas, unknown>> = {};
  for (const source of ["params", "query", "body", "formData"] as const) {
    const schema = contract[source];
    if (schema) input[source] = schema.parse(values[source]);
  }

  return input as RouteInput<Contract>;
};
