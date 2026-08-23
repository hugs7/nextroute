import { Node, Type } from "ts-morph";

const propertyKey = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));

const literalSchema = (value: string | number | boolean): string => `z.literal(${JSON.stringify(value)})`;

/** Converts a resolved TypeScript wire type into an equivalent generated Zod schema. */
export const typeToZodSchema = (type: Type, location: Node): string => {
  if (type.isString()) return "z.string()";
  if (type.isNumber()) return "z.number()";
  if (type.isBoolean()) return "z.boolean()";
  if (type.isStringLiteral() || type.isNumberLiteral()) {
    const value = type.getLiteralValue();
    if (typeof value === "string") return literalSchema(value);
    if (typeof value === "number") return literalSchema(value);
  }
  if (type.isBooleanLiteral()) return literalSchema(type.getText(location) === "true");
  if (type.isNull()) return "z.null()";
  if (type.isUndefined()) return "z.undefined()";
  if (type.isNever()) return "z.never()";
  if (type.isUnknown()) return "z.unknown()";
  if (type.isAny()) throw new Error(`Cannot generate a Zod schema for any: ${type.getText(location)}`);

  const text = type.getText(location);
  const symbolName = type.getSymbol()?.getName() ?? type.getAliasSymbol()?.getName();
  if (symbolName === "Date" || symbolName === "NativeDate" || text === "Date" || text === "NativeDate") {
    return "z.date()";
  }
  if (symbolName === "ObjectId") return "z.string()";

  if (type.isUnion()) {
    const members = type.getUnionTypes();
    if (members.length === 2 && members.some((member) => member.isUndefined())) {
      const value = members.find((member) => !member.isUndefined());
      if (value) return `${typeToZodSchema(value, location)}.optional()`;
    }
    if (members.length === 2 && members.some((member) => member.isNull())) {
      const value = members.find((member) => !member.isNull());
      if (value) return `${typeToZodSchema(value, location)}.nullable()`;
    }
    return `z.union([${members.map((member) => typeToZodSchema(member, location)).join(", ")}])`;
  }

  if (type.isIntersection()) {
    return type
      .getIntersectionTypes()
      .map((member) => typeToZodSchema(member, location))
      .reduce((left, right) => `z.intersection(${left}, ${right})`);
  }

  if (type.isTuple()) {
    return `z.tuple([${type
      .getTupleElements()
      .map((element) => typeToZodSchema(element, location))
      .join(", ")}])`;
  }

  const arrayElement = type.getArrayElementType();
  if (arrayElement) return `z.array(${typeToZodSchema(arrayElement, location)})`;

  const stringIndexType = type.getStringIndexType();
  const properties = type.getProperties();
  if (stringIndexType && properties.length === 0) {
    return `z.record(z.string(), ${typeToZodSchema(stringIndexType, location)})`;
  }

  if (type.isObject()) {
    const fields = properties.map((property) => {
      const declaration = property.getValueDeclaration() ?? property.getDeclarations()[0] ?? location;
      const propertyType = property.getTypeAtLocation(declaration);
      const definedTypes = propertyType.isUnion()
        ? propertyType.getUnionTypes().filter((member) => !member.isUndefined())
        : [propertyType];
      const nonNullType =
        definedTypes.length === 2 && definedTypes.some((member) => member.isNull())
          ? definedTypes.find((member) => !member.isNull())
          : undefined;

      try {
        const definedSchema = nonNullType
          ? `${typeToZodSchema(nonNullType, declaration)}.nullable()`
          : definedTypes.length === 1 && definedTypes[0]
            ? typeToZodSchema(definedTypes[0], declaration)
            : `z.union([${definedTypes.map((member) => typeToZodSchema(member, declaration)).join(", ")}])`;
        const schema = property.isOptional()
          ? `${definedSchema}.optional()`
          : typeToZodSchema(propertyType, declaration);
        return `${propertyKey(property.getName())}: ${schema}`;
      } catch (error) {
        throw new Error(`Cannot generate a Zod schema for property ${property.getName()}`, { cause: error });
      }
    });
    return `z.strictObject({ ${fields.join(", ")} })`;
  }

  throw new Error(`Cannot generate a Zod schema for type: ${text}`);
};
