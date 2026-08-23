import type { ContractRequest, ContractRouteContext, RouteInput, RouteMethodContract } from "../contracts";
import { parseRouteRequest } from "../contracts";

export type RouteHandlerArguments<Contract extends RouteMethodContract> = {
  context: ContractRouteContext;
  input: RouteInput<Contract>;
  request: ContractRequest;
};

export type RouteHandler<Contract extends RouteMethodContract> = (
  arguments_: RouteHandlerArguments<Contract>,
) => Promise<Response> | Response;

export type InvalidRequestHandler = (error: unknown) => Promise<Response> | Response;

export type RouteHandlerOptions = {
  onInvalidRequest?: InvalidRequestHandler;
};

const defaultInvalidRequestHandler: InvalidRequestHandler = () =>
  Response.json({ error: "Invalid request" }, { status: 400 });

/**
 * Creates a contract-validated App Router handler without imposing application middleware.
 *
 * @param contract - Contract for one HTTP method.
 * @param handler - Handler receiving parsed request input.
 * @param options - Optional application-owned invalid request response.
 * @returns A Web Request-compatible route handler.
 */
export const createRouteHandler = <Contract extends RouteMethodContract>(
  contract: Contract,
  handler: RouteHandler<Contract>,
  { onInvalidRequest = defaultInvalidRequestHandler }: RouteHandlerOptions = {},
) => {
  return async (request: ContractRequest, context: ContractRouteContext): Promise<Response> => {
    let input: RouteInput<Contract>;
    try {
      input = await parseRouteRequest(contract, request, context);
    } catch (error) {
      return onInvalidRequest(error);
    }

    return handler({ context, input, request });
  };
};
