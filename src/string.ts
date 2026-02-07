/**
 * Format a string to PascalCase
 *
 * @param str - The input string to format
 * @returns The formatted string in PascalCase
 */
export const pascalCase = (str: string): string =>
  str
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
