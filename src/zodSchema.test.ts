import { Project } from "ts-morph";

import { typeToZodSchema } from "./zodSchema";

describe("typeToZodSchema", () => {
  it("preserves nested wire types, dates, records, tuples, nulls, and optional fields", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const source = project.createSourceFile(
      "schema.ts",
      `type Wire = {
        createdAt: Date;
        label?: string | null;
        values: [number, boolean];
        metadata: Record<string, never>;
      };`,
    );
    const declaration = source.getTypeAliasOrThrow("Wire");

    expect(typeToZodSchema(declaration.getType(), declaration)).toBe(
      "z.strictObject({ createdAt: z.date(), label: z.string().nullable().optional(), values: z.tuple([z.number(), z.boolean()]), metadata: z.record(z.string(), z.never()) })",
    );
  });
});
