/**
 * Type definitions for route builder
 */

import type { AnyRouteContract, AnyRouteMethodContract, RouteRequest } from "../../contracts";

import { CamelCase, StripParentheses } from "./util";

declare const routeContractBrand: unique symbol;

/** A generated path carrying its route contract as type-only metadata. */
export type TypedRoute<Contract extends AnyRouteContract> = string & {
  readonly [routeContractBrand]: Contract;
};

/** Extract the contract carried by a generated route path. */
export type RouteContractOf<Route> = Route extends {
  readonly [routeContractBrand]: infer Contract extends AnyRouteContract;
}
  ? Contract
  : never;

/** HTTP methods declared by a generated route. */
export type RouteMethods<Route> = keyof RouteContractOf<Route> & keyof AnyRouteContract;

type RouteMethodAt<Route, Method extends RouteMethods<Route>> =
  RouteContractOf<Route> extends Record<Method, infer Contract extends AnyRouteMethodContract> ? Contract : never;

/** Query input accepted by a generated route method. */
export type RouteQuery<Route, Method extends RouteMethods<Route>> =
  RouteRequest<RouteMethodAt<Route, Method>> extends { query: infer Query } ? Query : never;

/** JSON body input accepted by a generated route method. */
export type RouteBody<Route, Method extends RouteMethods<Route>> =
  RouteRequest<RouteMethodAt<Route, Method>> extends { body: infer Body } ? Body : never;

/** Form-data input accepted by a generated route method. */
export type RouteFormData<Route, Method extends RouteMethods<Route>> =
  RouteRequest<RouteMethodAt<Route, Method>> extends { formData: infer FormData } ? FormData : never;

/** Status-discriminated responses returned by a generated route method. */
export type RouteResponses<Route, Method extends RouteMethods<Route>> = import("../../contracts").RouteResponse<
  RouteMethodAt<Route, Method>
>;

/**
 * Special keys used in route structure for metadata
 */
export type MetadataKey = keyof RouteMetadata;

type OmitParamMetaKey<T> = Omit<T, Extract<MetadataKey, "$$param">>;

// Helper to check if an object has non-metadata keys (children)
export type HasChildren<T> = keyof Omit<T, MetadataKey> extends never ? false : true;

// Get the type for a specific parameter from the type map
export type GetParamType<P extends string, TMap = {}> = P extends keyof TMap ? TMap[P] : string;

type ContractAt<Node> = Node extends { readonly $$contract: infer Contract extends AnyRouteContract }
  ? Contract
  : never;

type BuiltRoute<Node> = [ContractAt<Node>] extends [never] ? string : TypedRoute<ContractAt<Node>>;

type MethodParamInput<Method, Param extends string> = Method extends AnyRouteMethodContract
  ? RouteRequest<Method> extends { params: infer Params }
    ? Param extends keyof Params
      ? Params[Param]
      : never
    : never
  : never;

type ContractParamInput<Node, Param extends string> =
  ContractAt<Node> extends infer Contract extends AnyRouteContract
    ? {
        [Method in keyof Contract]: MethodParamInput<Contract[Method], Param>;
      }[keyof Contract]
    : never;

type RouteParamType<T, Node, Param extends string, TMap> = [ContractAt<Node>] extends [never]
  ? T extends { $$catchAll: true }
    ? GetParamType<Param, TMap>[]
    : GetParamType<Param, TMap>
  : ContractParamInput<Node, Param>;

type ParamArguments<T, Param> = T extends { $$optionalCatchAll: true }
  ? [param?: Exclude<Param, undefined>]
  : [param: Param];

// Type-safe route builder types
export type RouteBuilder<T, TMap = {}> = T extends { $$param: infer P extends string }
  ? HasChildren<T> extends true
    ? (
        ...args: ParamArguments<T, RouteParamType<T, T, P, TMap>>
      ) => RouteBuilderObject<OmitParamMetaKey<T>, TMap> &
        (T extends { $$route: true } ? { $: () => BuiltRoute<T> } : {})
    : T extends { $$route: true }
      ? (...args: ParamArguments<T, RouteParamType<T, T, P, TMap>>) => BuiltRoute<T>
      : (...args: ParamArguments<T, RouteParamType<T, T, P, TMap>>) => RouteBuilderObject<OmitParamMetaKey<T>, TMap>
  : T extends { $$route: true }
    ? HasChildren<T> extends true
      ? RouteBuilderObject<T, TMap> & { $: () => BuiltRoute<T> }
      : () => BuiltRoute<T>
    : T extends object
      ? RouteBuilderObject<T, TMap>
      : never;

export type RouteBuilderObject<T, TMap = {}> = {
  [K in keyof T as K extends MetadataKey ? never : CamelCase<StripParentheses<K & string>>]: RouteBuilder<T[K], TMap>;
};

// Meta keys are double-dollar prefixed to avoid collisions with
// potential route slugs with the same name.
type RouteMetadata = {
  /** Whether the dynamic segment captures all remaining path segments */
  $$catchAll?: boolean;
  /** Client-facing route contract metadata */
  $$contract?: AnyRouteContract;
  /** Whether a catch-all segment may be omitted */
  $$optionalCatchAll?: boolean;
  /** Parameter name for dynamic segments */
  $$param?: string;
  /** Whether this node has a route file */
  $$route?: boolean;
};

/**
 * Route structure node
 */
export type RouteNode = RouteMetadata & {
  [key: string]: any;
};
