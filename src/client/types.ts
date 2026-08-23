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

type ContractMethod<Route> = keyof RouteContractOf<Route> & HttpMethod;

type MethodContract<Route, Method extends HttpMethod> =
  RouteContractOf<Route> extends Record<Method, infer Contract extends RouteMethodContract> ? Contract : never;

type CommonRequestOptions = {
  headers?: Readonly<Record<string, string>>;
  signal?: unknown;
};

type ContractRequestOptions<Contract extends RouteMethodContract> = Omit<RouteRequest<Contract>, "params">;

export type RouteClientRequestOptions<Contract extends RouteMethodContract> = ContractRequestOptions<Contract> &
  CommonRequestOptions;

type RequestArguments<Contract extends RouteMethodContract> = keyof ContractRequestOptions<Contract> extends never
  ? [options?: RouteClientRequestOptions<Contract>]
  : [options: RouteClientRequestOptions<Contract>];

export type RouteClient = {
  request<Route extends TypedRoute<RouteContract>, Method extends ContractMethod<Route>>(
    route: Route,
    method: Method,
    ...args: RequestArguments<MethodContract<Route, Method>>
  ): Promise<RouteResponse<MethodContract<Route, Method>>>;
};
