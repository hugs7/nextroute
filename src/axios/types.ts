import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import type {
  AnyRouteContract,
  AnyRouteMethodContract,
  HttpMethod,
  RouteRequest,
  RouteResponseData,
  RouteResponseStatus,
} from "../contracts";
import type { TypedRoute } from "../runtime";
import type { RouteClientMethod, RouteMethodContractOf } from "../client";

type ContractRequestOptions<Contract extends AnyRouteMethodContract> = Omit<RouteRequest<Contract>, "params">;

type RequiredKey<Value> = {
  [Key in keyof Value]-?: {} extends Pick<Value, Key> ? never : Key;
}[keyof Value];

export type AxiosRouteRequestConfig = Omit<
  AxiosRequestConfig<unknown>,
  "data" | "method" | "params" | "url" | "validateStatus"
>;

export type AxiosRouteRequestOptions<Contract extends AnyRouteMethodContract> = ContractRequestOptions<Contract> & {
  config?: AxiosRouteRequestConfig;
};

export type AxiosRouteRequestArguments<Contract extends AnyRouteMethodContract> =
  RequiredKey<ContractRequestOptions<Contract>> extends never
    ? [options?: AxiosRouteRequestOptions<Contract>]
    : [options: AxiosRouteRequestOptions<Contract>];

type SuccessfulRouteStatus<Contract extends AnyRouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: `${Status}` extends `2${string}` ? Status : never;
}[RouteResponseStatus<Contract>];

type FailedRouteStatus<Contract extends AnyRouteMethodContract> = Exclude<
  RouteResponseStatus<Contract>,
  SuccessfulRouteStatus<Contract>
>;

export type AxiosRouteResponse<Contract extends AnyRouteMethodContract> = {
  [Status in SuccessfulRouteStatus<Contract>]: Omit<
    AxiosResponse<RouteResponseData<Contract, Status>, unknown>,
    "data" | "status"
  > & {
    data: RouteResponseData<Contract, Status>;
    status: Status;
  };
}[SuccessfulRouteStatus<Contract>];

export type AxiosRouteErrorData<Contract extends AnyRouteMethodContract> = {
  [Status in FailedRouteStatus<Contract>]: RouteResponseData<Contract, Status>;
}[FailedRouteStatus<Contract>];

export type AxiosRouteError<Route, Method extends RouteClientMethod<Route>> = AxiosError<
  AxiosRouteErrorData<RouteMethodContractOf<Route, Method>>,
  unknown
>;

type AxiosRouteEndpoint<Route> =
  Route extends TypedRoute<infer Contract extends AnyRouteContract>
    ? {
        [Method in keyof Contract & HttpMethod]: Contract[Method] extends infer MethodContract extends
          AnyRouteMethodContract
          ? (...args: AxiosRouteRequestArguments<MethodContract>) => Promise<AxiosRouteResponse<MethodContract>>
          : never;
      }
    : {};

type AxiosRouteApiResult<Result> = Result extends string
  ? AxiosRouteEndpoint<Result>
  : Result extends object
    ? AxiosRouteApiObject<Result>
    : never;

type AxiosRouteApiChild<Key, Value> = Key extends `$${string}`
  ? Value extends (...args: infer Arguments) => infer Result
    ? (...args: Arguments) => AxiosRouteApiResult<Result>
    : never
  : Value extends (...args: readonly unknown[]) => infer Result
    ? AxiosRouteApiResult<Result>
    : Value extends object
      ? AxiosRouteApiObject<Value>
      : never;

type SelfEndpoint<Routes> = Routes extends { $: () => infer Route } ? AxiosRouteEndpoint<Route> : {};

type AxiosRouteApiObject<Routes> = {
  [Key in Exclude<keyof Routes, "$">]: AxiosRouteApiChild<Key, Routes[Key]>;
} & SelfEndpoint<Routes>;

export type AxiosRouteApi<Routes> = AxiosRouteApiObject<Routes>;
