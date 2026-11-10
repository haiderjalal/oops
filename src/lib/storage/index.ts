import "server-only";

import { getStorageConfig } from "@/lib/config";

import { createLocalStorage } from "./local";
import { createS3Storage } from "./s3";
import type { StorageProvider } from "./types";

export type { StorageProvider, UploadTarget } from "./types";

declare global {
  var __oopsStorage: StorageProvider | undefined;
}

/** The configured storage provider (local disk in development, S3-compatible in production). */
export function getStorage(): StorageProvider {
  if (!globalThis.__oopsStorage) {
    const config = getStorageConfig();
    globalThis.__oopsStorage =
      config.driver === "s3" ? createS3Storage(config) : createLocalStorage(config.directory);
  }
  return globalThis.__oopsStorage;
}
