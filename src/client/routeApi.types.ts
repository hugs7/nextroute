import type { HttpMethod, RouteContract, RouteMethodContract, RouteResponse } from "../contracts";
import type { TypedRoute } from "../runtime";

import type { RouteClientRequestArguments } from "./types";

type RouteEndpoint<Route> =
  Route extends TypedRoute<infer Contract extends RouteContract>
    ? {
        [Method in keyof Contract & HttpMethod]: Contract[Method] extends infer MethodContract extends
          RouteMethodContract
          ? (...args: RouteClientRequestArguments<MethodContract>) => Promise<RouteResponse<MethodContract>>
          : never;
      }
    : {};

type RouteApiResult<Result> = Result extends string
  ? RouteEndpoint<Result>
  : Result extends object
    ? RouteApiObject<Result>
    : never;

type RouteApiChild<Key, Value> = Key extends `$${string}`
  ? Value extends (...args: infer Arguments) => infer Result
    ? (...args: Arguments) => RouteApiResult<Result>
    : never
  : Value extends (...args: readonly unknown[]) => infer Result
    ? RouteApiResult<Result>
    : Value extends object
      ? RouteApiObject<Value>
      : never;

type SelfEndpoint<Routes> = Routes extends { $: () => infer Route } ? RouteEndpoint<Route> : {};

type RouteApiObject<Routes> = {
  [Key in Exclude<keyof Routes, "$">]: RouteApiChild<Key, Routes[Key]>;
} & SelfEndpoint<Routes>;

export type RouteApi<Routes> = RouteApiObject<Routes>;
