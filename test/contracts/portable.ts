import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../../src/contracts";

export const portableRouteContract = defineRouteContract({
  GET: {
    responses: { 200: jsonResponse(z.object({ portable: z.literal(true) })) },
  },
});
