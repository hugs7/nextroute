import { mkdir } from "fs/promises";
import { existsSync } from "fs";

/**
 * Make sure a directory exists, creating it if necessary
 *
 * @param dirPath - The path of the directory to ensure exists
 */
export const mkdirIfNotExists = async (dirPath: string): Promise<void> => {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
};
