import { z } from "zod";

import {
  JsonResponseDefinition,
  NoContentResponseDefinition,
  RouteMethodContract,
  RouteResponseData,
  RouteResponseDefinition,
  RouteResponseStatus,
} from "./types";

/**
 * Defines a JSON response schema.
 *
 * @param schema - Zod schema describing the response wire format.
 * @returns A JSON response definition.
 */
export const jsonResponse = <Schema extends z.ZodType>(schema: Schema): JsonResponseDefinition<Schema> => ({
  contentType: "application/json",
  schema,
});

/** Defines an empty response body. */
export const noContentResponse = (): NoContentResponseDefinition => ({ contentType: null });

const getResponseDefinition = <Contract extends RouteMethodContract>(
  contract: Contract,
  status: RouteResponseStatus<Contract>,
): RouteResponseDefinition => {
  const definition: RouteResponseDefinition | undefined = contract.responses[status];
  if (!definition) throw new Error(`Response status ${status} is not declared by this route contract`);
  return definition;
};

/**
 * Creates and validates a JSON response for a method contract.
 *
 * @param contract - Method contract owning the response.
 * @param status - Declared response status.
 * @param data - Response payload matching that status's schema.
 * @returns A standard Web Response.
 */
export const routeJson = <Contract extends RouteMethodContract, Status extends RouteResponseStatus<Contract>>(
  contract: Contract,
  status: Status,
  data: RouteResponseData<Contract, Status>,
): Response => {
  const definition = getResponseDefinition(contract, status);
  if (definition.contentType !== "application/json") {
    throw new Error(`Response status ${status} is not declared as JSON`);
  }

  return Response.json(definition.schema.parse(data), { status });
};

/**
 * Creates an empty response for a declared no-content status.
 *
 * @param contract - Method contract owning the response.
 * @param status - Declared no-content response status.
 * @returns A standard Web Response.
 */
export const routeNoContent = <Contract extends RouteMethodContract, Status extends RouteResponseStatus<Contract>>(
  contract: Contract,
  status: Status,
): Response => {
  const definition = getResponseDefinition(contract, status);
  if (definition.contentType !== null) throw new Error(`Response status ${status} is not declared as no-content`);
  return new Response(null, { status });
};
