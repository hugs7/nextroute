import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../../../../../../src/contracts";

export const routeContract = defineRouteContract({
  GET: {
    params: z.object({ userId: z.literal("contract_user") }),
    responses: {
      200: jsonResponse(z.object({ message: z.string() })),
    },
  },
});

export async function GET() {
  return Response.json({ message: "Get user by id" });
}
