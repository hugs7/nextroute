import { RouteContract } from "./types";

/**
 * Defines the request and response contracts exported by one App Router route file.
 *
 * @param contract - Method-keyed route contract.
 * @returns The contract unchanged, preserving its inferred literal types.
 */
export const defineRouteContract = <const Contract extends RouteContract>(contract: Contract): Contract => contract;
