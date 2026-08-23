import type { z } from "zod";

export type HttpMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";

export type RouteRequestSchemas = {
  body?: z.ZodType;
  formData?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

export type JsonResponseDefinition<Schema extends z.ZodType = z.ZodType> = {
  contentType: "application/json";
  schema: Schema;
};

export type NoContentResponseDefinition = {
  contentType: null;
};

export type RouteResponseDefinition = JsonResponseDefinition | NoContentResponseDefinition;

type ExclusiveRequestBody = { body?: never; formData?: z.ZodType } | { body?: z.ZodType; formData?: never };

export type RouteMethodContract = Omit<RouteRequestSchemas, "body" | "formData"> &
  ExclusiveRequestBody & {
    responses: Record<number, RouteResponseDefinition>;
  };

export type RouteContract = Partial<Record<HttpMethod, RouteMethodContract>>;

type RequestSchemaKey = keyof RouteRequestSchemas;

type SchemaAt<Contract, Key extends RequestSchemaKey> =
  Contract extends Record<Key, infer Schema extends z.ZodType> ? Schema : never;

type ConfiguredRequestKey<Contract> = {
  [Key in RequestSchemaKey]: Contract extends Record<Key, z.ZodType> ? Key : never;
}[RequestSchemaKey];

type OptionalInputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.input<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];

type OptionalOutputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.output<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];

type Simplify<Value> = {
  [Key in keyof Value]: Value[Key];
};

export type RouteInput<Contract extends RouteMethodContract> = Simplify<
  {
    [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalOutputKey<Contract>>]: z.output<SchemaAt<Contract, Key>>;
  } & {
    [Key in OptionalOutputKey<Contract>]?: z.output<SchemaAt<Contract, Key>>;
  }
>;

export type RouteRequest<Contract extends RouteMethodContract> = Simplify<
  {
    [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalInputKey<Contract>>]: z.input<SchemaAt<Contract, Key>>;
  } & {
    [Key in OptionalInputKey<Contract>]?: z.input<SchemaAt<Contract, Key>>;
  }
>;

export type RouteResponseStatus<Contract extends RouteMethodContract> = keyof Contract["responses"] & number;

export type JsonRouteResponseStatus<Contract extends RouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: Contract["responses"][Status] extends JsonResponseDefinition
    ? Status
    : never;
}[RouteResponseStatus<Contract>];

export type NoContentRouteResponseStatus<Contract extends RouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: Contract["responses"][Status] extends NoContentResponseDefinition
    ? Status
    : never;
}[RouteResponseStatus<Contract>];

type ResponseData<Definition extends RouteResponseDefinition> =
  Definition extends JsonResponseDefinition<infer Schema> ? z.output<Schema> : undefined;

export type RouteResponseData<
  Contract extends RouteMethodContract,
  Status extends RouteResponseStatus<Contract>,
> = ResponseData<Contract["responses"][Status]>;

export type RouteResponse<Contract extends RouteMethodContract> = {
  [Status in RouteResponseStatus<Contract>]: {
    data: RouteResponseData<Contract, Status>;
    status: Status;
  };
}[RouteResponseStatus<Contract>];
