import { generateRouteFile } from "./generator";

describe("contract generation", () => {
  it("embeds a self-contained contract type in its route node", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          segments: ["users"],
          typeText: "{ readonly GET: { readonly request: {}; readonly responses: { readonly 200: string } } }",
        },
      ],
    );

    expect(code).toContain("$$contract: undefined as unknown as");
    expect(code).toContain("readonly 200: string");
    expect(code).not.toContain("typeof import");
  });

  it("omits route contracts from path-only output", async () => {
    const code = await generateRouteFile(
      {},
      { contracts: false, input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          segments: ["users"],
          typeText: "{ readonly GET: { readonly request: {}; readonly responses: {} } }",
        },
      ],
    );

    expect(code).not.toContain("/app/api/users/route");
  });
});
