import { generateRouteFile } from "./generator";

describe("contract generation", () => {
  it("rejects inline contracts for portable output", async () => {
    await expect(
      generateRouteFile({}, { input: "./app/api", output: "./generated/routes.ts", portable: true }, [
        {
          exportName: "routeContract",
          filePath: "/app/api/users/route.ts",
          portable: false,
          segments: ["users"],
        },
      ]),
    ).rejects.toThrow("Re-export routeContract from a shared publishable module");
  });
});
