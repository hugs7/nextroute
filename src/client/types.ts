import type { HttpMethod, RouteContract, RouteMethodContract, RouteRequest, RouteResponse } from "../contracts";
import type { RouteContractOf, TypedRoute } from "../runtime";

export type RouteTransportRequest = {
  body?: unknown;
  formData?: unknown;
  headers?: Readonly<Record<string, string>>;
  method: HttpMethod;
  signal?: unknown;
  url: string;
};

export type RouteTransportResponse = {
  data: unknown;
  status: number;
};

export type RouteTransport = (request: RouteTransportRequest) => Promise<RouteTransportResponse>;

export type QuerySerializer = (query: unknown) => string;

export type RouteClientOptions = {
  serializeQuery?: QuerySerializer;
  transport: RouteTransport;
};

export type RouteClientMethod<Route> = keyof RouteContractOf<Route> & HttpMethod;

export type RouteMethodContractOf<Route, Method extends HttpMethod> =
  RouteContractOf<Route> extends Record<Method, infer Contract extends RouteMethodContract> ? Contract : never;

type CommonRequestOptions = {
  headers?: Readonly<Record<string, string>>;
  signal?: unknown;
};

type ContractRequestOptions<Contract extends RouteMethodContract> = Omit<RouteRequest<Contract>, "params">;

type RequiredKey<Value> = {
  [Key in keyof Value]-?: {} extends Pick<Value, Key> ? never : Key;
}[keyof Value];

export type RouteClientRequestOptions<Contract extends RouteMethodContract> = ContractRequestOptions<Contract> &
  CommonRequestOptions;

export type RouteClientRequestArguments<Contract extends RouteMethodContract> =
  RequiredKey<ContractRequestOptions<Contract>> extends never
    ? [options?: RouteClientRequestOptions<Contract>]
    : [options: RouteClientRequestOptions<Contract>];

export type RouteClient = {
  request<Route extends TypedRoute<RouteContract>, Method extends RouteClientMethod<Route>>(
    route: Route,
    method: Method,
    ...args: RouteClientRequestArguments<RouteMethodContractOf<Route, Method>>
  ): Promise<RouteResponse<RouteMethodContractOf<Route, Method>>>;
};
