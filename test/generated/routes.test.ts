import { RouteContractOf, TypedRoute } from "next-typed-paths/runtime";
import { routeContract } from "../app/api/(collections)/users/[userId]/route";

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
  });

  it("should not include private routes", () => {
    expect(ROUTES.hyphenedRoute).not.toHaveProperty("_private");
  });

  it("carries its contract and uses contract param input", () => {
    type UserRoute = ReturnType<typeof ROUTES.collections.users.$userId>;
    type UserRouteParam = Parameters<typeof ROUTES.collections.users.$userId>[0];

    expectTypeOf<UserRoute>().toEqualTypeOf<TypedRoute<typeof routeContract>>();
    expectTypeOf<RouteContractOf<UserRoute>>().toEqualTypeOf<typeof routeContract>();
    expectTypeOf<UserRouteParam>().toEqualTypeOf<"contract_user">();
  });
});
