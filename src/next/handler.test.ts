import { z } from "zod";

import { defineRouteContract, jsonResponse, routeJson } from "../contracts";

import { createRouteHandler } from "./handler";

const routeContract = defineRouteContract({
  POST: {
    body: z.object({ count: z.number() }),
    responses: {
      200: jsonResponse(z.object({ doubled: z.number() })),
    },
  },
});

const handler = createRouteHandler(routeContract.POST, ({ input }) =>
  routeJson(routeContract.POST, 200, { doubled: input.body.count * 2 }),
);

describe("createRouteHandler", () => {
  it("passes parsed contract input to the handler", async () => {
    const response = await handler(
      new Request("https://example.com/count", {
        body: JSON.stringify({ count: 3 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ doubled: 6 });
  });

  it("returns 400 before application middleware for invalid input", async () => {
    const response = await handler(
      new Request("https://example.com/count", {
        body: JSON.stringify({ count: "three" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
  });
});
