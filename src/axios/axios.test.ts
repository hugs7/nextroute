import axios, { AxiosAdapter, AxiosRequestConfig } from "axios";
import { z } from "zod";

import { defineRouteContract, jsonResponse } from "../contracts";
import { TypedRoute } from "../runtime";

import { createAxiosRouteApi } from "./axios";

const checkoutContract = defineRouteContract({
  POST: {
    body: z.object({ amount: z.number() }),
    query: z.object({ sendReceipt: z.boolean().optional() }),
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

describe("Axios route API", () => {
  it("injects route contract input into an application-owned Axios instance", async () => {
    let request: AxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      request = config;
      return {
        config,
        data: { checkoutId: "checkout-1" },
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };
    const instance = axios.create({ adapter, transformRequest: (data) => data });
    const api = createAxiosRouteApi(routes, instance);

    const response = await api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST({
      body: { amount: 42 },
      config: { headers: { "x-request-id": "request-1" } },
      query: { sendReceipt: true },
    });

    expect(request).toMatchObject({
      data: { amount: 42 },
      method: "post",
      params: { sendReceipt: true },
      url: "/api/appointments/by-id/appointment-1/checkout",
    });
    expect(request?.validateStatus?.(400)).toBe(false);
    expect(response.data).toEqual({ checkoutId: "checkout-1" });
    expectTypeOf(response.data).toEqualTypeOf<{ checkoutId: string }>();
    expectTypeOf(response.status).toEqualTypeOf<200>();
  });

  it("only exposes supported inputs, methods, and successful response data", () => {
    const api = createAxiosRouteApi(routes, axios.create());

    if (false) {
      // @ts-expect-error GET is not declared by the checkout contract.
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.GET();
      // @ts-expect-error The POST body is required.
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST();
      // @ts-expect-error amount must match the route's body schema.
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST({ body: { amount: "42" } });
      void api.api.appointments.byId.$appointmentId("appointment-1").checkout.POST({
        body: { amount: 42 },
        // @ts-expect-error Contracted requests must retain non-2xx rejection.
        config: { validateStatus: () => true },
      });
      // @ts-expect-error Pages without route contracts do not gain HTTP methods.
      void api.login.GET();
    }

    expect(api).toBeDefined();
  });
});
