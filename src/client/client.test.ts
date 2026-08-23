import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../contracts";
import { TypedRoute } from "../runtime";

import { createRouteClient } from "./client";
import { RouteTransportRequest } from "./types";

const routeContract = defineRouteContract({
  GET: {
    query: z.object({ page: z.string(), tag: z.array(z.string()).optional() }),
    responses: {
      200: jsonResponse(z.object({ names: z.array(z.string()) })),
      404: jsonResponse(z.object({ error: z.string() })),
    },
  },
});

const route = "/users" as TypedRoute<typeof routeContract>;

describe("route client", () => {
  it("serializes contract input and returns typed responses", async () => {
    let request: RouteTransportRequest | undefined;
    const client = createRouteClient({
      transport: async (input) => {
        request = input;
        return { data: { names: ["Ada"] }, status: 200 };
      },
    });

    const response = await client.request(route, "GET", { query: { page: "2", tag: ["admin", "owner"] } });

    expect(request).toEqual({
      body: undefined,
      formData: undefined,
      headers: undefined,
      method: "GET",
      signal: undefined,
      url: "/users?page=2&tag=admin&tag=owner",
    });
    expectTypeOf(response).toEqualTypeOf<
      { data: { names: string[] }; status: 200 } | { data: { error: string }; status: 404 }
    >();
  });

  it("rejects methods and request shapes outside the route contract", () => {
    const client = createRouteClient({ transport: async () => ({ data: undefined, status: 204 }) });

    if (false) {
      // @ts-expect-error POST is not declared by this route.
      void client.request(route, "POST", {});
      // @ts-expect-error GET requires its declared query input.
      void client.request(route, "GET");
    }

    expect(client).toBeDefined();
  });
});
