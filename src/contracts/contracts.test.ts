import { z } from "zod";

import { defineRouteContract } from "./contract";
import { parseRouteRequest } from "./request";
import { jsonResponse, noContentResponse, routeJson, routeNoContent } from "./response";
import { RouteInput, RouteRequest, RouteResponse } from "./types";

const contract = defineRouteContract({
  GET: {
    params: z.object({ userId: z.string() }),
    query: z.object({ page: z.coerce.number() }),
    responses: {
      200: jsonResponse(z.object({ name: z.string() })),
      404: jsonResponse(z.object({ error: z.string() })),
    },
  },
  POST: {
    body: z.object({ name: z.string() }),
    responses: { 204: noContentResponse() },
  },
});

describe("route contracts", () => {
  it("preserves request input and parsed output types", () => {
    expectTypeOf<RouteRequest<typeof contract.GET>>().toEqualTypeOf<{
      params: { userId: string };
      query: { page: unknown };
    }>();
    expectTypeOf<RouteInput<typeof contract.GET>>().toEqualTypeOf<{
      params: { userId: string };
      query: { page: number };
    }>();
  });

  it("creates a status-discriminated response union", () => {
    expectTypeOf<RouteResponse<typeof contract.GET>>().toEqualTypeOf<
      { data: { name: string }; status: 200 } | { data: { error: string }; status: 404 }
    >();
  });

  it("parses params, repeated query values, and coerced values", async () => {
    const input = await parseRouteRequest(contract.GET, new Request("https://example.com/users/123?page=2"), {
      params: Promise.resolve({ userId: "123" }),
    });

    expect(input).toEqual({ params: { userId: "123" }, query: { page: 2 } });
  });

  it("validates JSON and no-content responses", async () => {
    const json = routeJson(contract.GET, 200, { name: "Ada" });
    expect(json.status).toBe(200);
    await expect(json.json()).resolves.toEqual({ name: "Ada" });

    const empty = routeNoContent(contract.POST, 204);
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");
  });

  it("rejects invalid response payloads", () => {
    expect(() => routeJson(contract.GET, 200, { name: 123 } as never)).toThrow();
  });
});
