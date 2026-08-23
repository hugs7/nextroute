import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../../../../../../src/contracts";

export const routeContract = defineRouteContract({
  GET: {
    params: z.object({ userId: z.literal("contract_user") }),
    responses: {
      200: jsonResponse(z.object({ message: z.string() })),
    },
  },
  POST: {
    body: z.object({ name: z.string() }),
    params: z.object({ userId: z.literal("contract_user") }),
    responses: {
      201: jsonResponse(z.object({ id: z.string(), name: z.string() })),
    },
  },
});

export async function GET() {
  return Response.json({ message: "Get user by id" });
}

export async function POST() {
  return Response.json({ id: "contract_user", name: "Ada" }, { status: 201 });
}
