import { RouteBody, RouteContractOf, RouteMethods, RouteResponses, TypedRoute } from "next-typed-paths/runtime";

import type { routeContract as userRouteContract } from "../app/api/(collections)/users/[userId]/route";
import { EXTERNAL_ROUTES } from "./external-routes";
import { ROUTES } from "./routes";

describe("Generated routes", () => {
  it("should have generated routes matching the typing", () => {
    expect(typeof ROUTES.hyphenedRoute).toBe("function");
    expect(ROUTES.hyphenedRoute()).toBe("/api/hyphened-route");

    expect(typeof ROUTES.collections.posts).toBe("object");
    expect(typeof ROUTES.collections.posts.$postId).toBe("function");
    expect(ROUTES.collections.posts.$postId(123)).toBe("/api/posts/123");

    expect(typeof ROUTES.collections.users).toBe("object");
    expect(typeof ROUTES.collections.users.$userId).toBe("function");
    expect(ROUTES.collections.users.$userId("contract_user")).toBe("/api/users/contract_user");
    expect(ROUTES.collections.users.$()).toBe("/api/users");

    expect(ROUTES.files.$path(["reports", "2026"])).toBe("/api/files/reports/2026");
    expect(ROUTES.docs.$slug()).toBe("/api/docs");
    expect(ROUTES.docs.$slug(["guides", "setup"])).toBe("/api/docs/guides/setup");
  });

  it("should not include private routes", () => {
    expect(ROUTES.hyphenedRoute).not.toHaveProperty("_private");
  });

  it("carries its contract and uses contract param input", () => {
    type UserRoute = ReturnType<typeof ROUTES.collections.users.$userId>;
    type UserRouteParam = Parameters<typeof ROUTES.collections.users.$userId>[0];

    expectTypeOf<UserRoute>().toEqualTypeOf<TypedRoute<typeof userRouteContract>>();
    expectTypeOf<RouteContractOf<UserRoute>>().toEqualTypeOf<typeof userRouteContract>();
    expectTypeOf<RouteMethods<UserRoute>>().toEqualTypeOf<"GET" | "POST">();
    expectTypeOf<RouteBody<UserRoute, "POST">>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<UserRouteParam>().toEqualTypeOf<"contract_user">();
  });

  it("infers the same contract from external generated Zod schemas", () => {
    type ExternalUserRoute = ReturnType<typeof EXTERNAL_ROUTES.collections.users.$userId>;
    type InternalUserRoute = ReturnType<typeof ROUTES.collections.users.$userId>;

    expect(EXTERNAL_ROUTES.collections.users.$userId("contract_user")).toBe("/api/users/contract_user");
    expectTypeOf<RouteBody<ExternalUserRoute, "POST">>().toEqualTypeOf<RouteBody<InternalUserRoute, "POST">>();
    expectTypeOf<RouteResponses<ExternalUserRoute, "GET">>().toEqualTypeOf<RouteResponses<InternalUserRoute, "GET">>();
  });
});
