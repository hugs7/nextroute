import { Project } from "ts-morph";

import { resolveRouteContractsSchemas } from "./contractType";

describe("resolveRouteContractsSchemas", () => {
  it("resolves multiple route contracts in one compiler helper without mixing their schemas", () => {
    const project = new Project({ tsConfigFilePath: "tsconfig.spec.json", skipAddingFilesFromTsConfig: true });
    const userRoute = project.addSourceFileAtPath("test/app/api/(collections)/users/[userId]/route.ts");
    const portableRoute = project.addSourceFileAtPath("test/app/api/portable/route.ts");
    project.resolveSourceFileDependencies();

    const [userContract, portableContract] = resolveRouteContractsSchemas(project, [userRoute, portableRoute]);

    expect(userContract?.methods.map(({ method }) => method)).toEqual(["GET", "POST"]);
    expect(userContract?.methods[0]?.requestSchema).toContain('userId: z.literal("contract_user")');
    expect(portableContract?.methods.map(({ method }) => method)).toEqual(["GET"]);
    expect(portableContract?.methods[0]?.responses[0]?.schema).toContain("portable: z.literal(true)");
  });
});
