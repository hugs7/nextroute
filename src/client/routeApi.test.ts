import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../contracts";
import { TypedRoute } from "../runtime";

import { createRouteClient } from "./client";
import { createRouteApi } from "./routeApi";
import { RouteTransportRequest } from "./types";

const checkoutContract = defineRouteContract({
  POST: {
    body: z.object({ amount: z.number() }),
    responses: {
      200: jsonResponse(z.object({ checkoutId: z.string() })),
      400: jsonResponse(z.object({ error: z.string() })),
    },
  },
});

const routes = {
  api: {
    appointments: {
      byId: {
        $appointmentId: (appointmentId: string) => ({
          checkout: () => `/api/appointments/by-id/${appointmentId}/checkout` as TypedRoute<typeof checkoutContract>,
        }),
      },
    },
  },
  login: () => "/login",
};

describe("route API", () => {
  it("turns the generated route tree into chainable contract methods", async () => {
    let request: RouteTransportRequest | undefined;
    const client = createRouteClient({
      transport: async (input) => {
        request = input;
        return { data: { checkoutId: "checkout-1" }, status: 200 };
      },
    });
    const api = createRouteApi(routes, client);

    const response = await api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST({
      body: { amount: 42 },
    });

    expect(request).toMatchObject({
      body: { amount: 42 },
      method: "POST",
      url: "/api/appointments/by-id/appointment-1/checkout",
    });
    expect(response).toEqual({ data: { checkoutId: "checkout-1" }, status: 200 });
    expectTypeOf(response).toEqualTypeOf<
      { data: { checkoutId: string }; status: 200 } | { data: { error: string }; status: 400 }
    >();
  });

  it("only exposes contract-declared methods in its type", () => {
    const api = createRouteApi(
      routes,
      createRouteClient({ transport: async () => ({ data: undefined, status: 204 }) }),
    );

    if (false) {
      // @ts-expect-error GET is not declared by the checkout contract.
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.GET();
      // @ts-expect-error The POST body is required.
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST();
      // @ts-expect-error Pages without route contracts do not gain HTTP methods.
      void api.login.GET();
    }

    expect(api).toBeDefined();
  });
});
