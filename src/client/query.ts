/**
 * Serializes a flat query object, preserving repeated array values.
 *
 * @param query - Query object from a route contract.
 * @returns A URL query string without a leading question mark.
 */
export const serializeQuery = (query: unknown): string => {
  if (!query || typeof query !== "object") return "";

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    for (const item of Array.isArray(value) ? value : [value]) {
      searchParams.append(key, String(item));
    }
  }

  return searchParams.toString();
};
