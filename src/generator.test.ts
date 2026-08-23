import { generateRouteFile } from "./generator";

describe("contract generation", () => {
  it("generates standalone Zod schemas for external output", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { contractMode: "external", input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          methods: [
            {
              method: "GET",
              requestSchema: "z.strictObject({})",
              responses: [{ schema: "z.string()", status: "200" }],
            },
          ],
          segments: ["users"],
          sourcePath: "/project/app/api/users/route.ts",
        },
      ],
    );

    expect(code).toContain('import { z } from "zod"');
    expect(code).toContain("const routeContract0GetResponse200Schema = z.string()");
    expect(code).toContain("readonly 200: z.infer<typeof routeContract0GetResponse200Schema>");
    expect(code).not.toContain("undefined as unknown as");
  });

  it("references route contracts with type-only imports for internal output", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { contractMode: "internal", input: "/project/src/app/api", output: "/project/src/generated/routes.ts" },
      [
        {
          methods: [],
          segments: ["users"],
          sourcePath: "/project/src/app/api/users/route.ts",
        },
      ],
    );

    expect(code).toContain('import type { routeContract as routeContract0 } from "../app/api/users/route"');
    expect(code).toContain("readonly $$contract: typeof routeContract0");
    expect(code).not.toContain("undefined as unknown as");
  });

  it("omits route contracts from path-only output", async () => {
    const code = await generateRouteFile(
      {},
      { contracts: false, input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          methods: [],
          segments: ["users"],
          sourcePath: "/project/app/api/users/route.ts",
        },
      ],
    );

    expect(code).not.toContain("/app/api/users/route");
  });
});
