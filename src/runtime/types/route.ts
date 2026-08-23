/**
 * Type definitions for route builder
 */

import type { RouteContract, RouteMethodContract, RouteRequest } from "../../contracts";

import { CamelCase, StripParentheses } from "./util";

declare const routeContractBrand: unique symbol;

/** A generated path carrying its route contract as type-only metadata. */
export type TypedRoute<Contract extends RouteContract> = string & {
  readonly [routeContractBrand]: Contract;
};

/** Extract the contract carried by a generated route path. */
export type RouteContractOf<Route> = Route extends {
  readonly [routeContractBrand]: infer Contract extends RouteContract;
}
  ? Contract
  : never;

/**
 * Special keys used in route structure for metadata
 */
export type MetadataKey = keyof RouteMetadata;

type OmitParamMetaKey<T> = Omit<T, Extract<MetadataKey, "$$param">>;

// Helper to check if an object has non-metadata keys (children)
export type HasChildren<T> = keyof Omit<T, MetadataKey> extends never ? false : true;

// Get the type for a specific parameter from the type map
export type GetParamType<P extends string, TMap = {}> = P extends keyof TMap ? TMap[P] : string;

type ContractAt<Node> = Node extends { readonly $$contract: infer Contract extends RouteContract } ? Contract : never;

type BuiltRoute<Node> = [ContractAt<Node>] extends [never] ? string : TypedRoute<ContractAt<Node>>;

type ContractChild<Node, Key> = Key extends keyof Node ? Node[Key] : {};

type MethodParamInput<Method, Param extends string> = Method extends RouteMethodContract
  ? RouteRequest<Method> extends { params: infer Params }
    ? Param extends keyof Params
      ? Params[Param]
      : never
    : never
  : never;

type ContractParamInput<Node, Param extends string> =
  ContractAt<Node> extends infer Contract extends RouteContract
    ? {
        [Method in keyof Contract]: MethodParamInput<Contract[Method], Param>;
      }[keyof Contract]
    : never;

type RouteParamType<T, Node, Param extends string, TMap> = [ContractParamInput<Node, Param>] extends [never]
  ? T extends { $$catchAll: true }
    ? GetParamType<Param, TMap>[]
    : GetParamType<Param, TMap>
  : ContractParamInput<Node, Param>;

type ParamArguments<T, Param> = T extends { $$optionalCatchAll: true }
  ? [param?: Exclude<Param, undefined>]
  : [param: Param];

// Type-safe route builder types
export type RouteBuilder<T, TMap = {}, TContracts = {}> = T extends { $$param: infer P extends string }
  ? HasChildren<T> extends true
    ? (
        ...args: ParamArguments<T, RouteParamType<T, TContracts, P, TMap>>
      ) => RouteBuilderObject<OmitParamMetaKey<T>, TMap, TContracts> &
        (T extends { $$route: true } ? { $: () => BuiltRoute<TContracts> } : {})
    : T extends { $$route: true }
      ? (...args: ParamArguments<T, RouteParamType<T, TContracts, P, TMap>>) => BuiltRoute<TContracts>
      : (
          ...args: ParamArguments<T, RouteParamType<T, TContracts, P, TMap>>
        ) => RouteBuilderObject<OmitParamMetaKey<T>, TMap, TContracts>
  : T extends { $$route: true }
    ? HasChildren<T> extends true
      ? RouteBuilderObject<T, TMap, TContracts> & { $: () => BuiltRoute<TContracts> }
      : () => BuiltRoute<TContracts>
    : T extends object
      ? RouteBuilderObject<T, TMap, TContracts>
      : never;

export type RouteBuilderObject<T, TMap = {}, TContracts = {}> = {
  [K in keyof T as K extends MetadataKey ? never : CamelCase<StripParentheses<K & string>>]: RouteBuilder<
    T[K],
    TMap,
    ContractChild<TContracts, K>
  >;
};

// Meta keys are double-dollar prefixed to avoid collisions with
// potential route slugs with the same name.
type RouteMetadata = {
  /** Whether the dynamic segment captures all remaining path segments */
  $$catchAll?: boolean;
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
