import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isSafeStorageKey } from "@/features/uploads/keys";

import type { CreateUploadTargetInput, StorageProvider, UploadTarget } from "./types";
import { signUploadToken } from "./uploadToken";

/**
 * Development-only storage on the local disk. Mirrors the S3 behaviour (signed, direct-style
 * upload followed by server-side processing) so the whole upload pipeline works with zero setup.
 * Production must use the S3-compatible driver.
 */
export function createLocalStorage(directory: string): StorageProvider {
  const root = path.resolve(directory);

  function resolveKey(key: string): string {
    if (!isSafeStorageKey(key)) throw new Error("Unsafe storage key");
    const resolved = path.resolve(root, key);
    if (!resolved.startsWith(root + path.sep))
      throw new Error("Storage key escapes the storage root");
    return resolved;
  }

  return {
    driver: "local",

    publicUrl: (key) => `/api/media/${key}`,

    async createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget> {
      const token = await signUploadToken(
        { key: input.key, contentType: input.contentType, contentLength: input.contentLength },
        input.expiresInSeconds,
      );
      return {
        url: `/api/uploads/local/${token}`,
        method: "PUT",
        headers: { "Content-Type": input.contentType },
        expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      };
    },

    async getObject(key) {
      try {
        return new Uint8Array(await readFile(resolveKey(key)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },

    async putObject(key, body) {
      const target = resolveKey(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },

    async deleteObject(key) {
      await rm(resolveKey(key), { force: true });
    },
  };
}
