import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageConfig } from "@/lib/config";
import { isSafeStorageKey } from "@/features/uploads/keys";

import type { CreateUploadTargetInput, StorageProvider, UploadTarget } from "./types";

type S3Config = Extract<StorageConfig, { driver: "s3" }>;

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * S3-compatible storage: AWS S3, Cloudflare R2, MinIO, Backblaze B2, Supabase Storage (S3 API)…
 * Uploads go straight from the browser to the bucket through a short-lived presigned PUT that is
 * bound to the exact content type and length the server approved.
 */
export function createS3Storage(config: S3Config): StorageProvider {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  function assertKey(key: string): void {
    if (!isSafeStorageKey(key)) throw new Error("Unsafe storage key");
  }

  return {
    driver: "s3",

    publicUrl: (key) => `${config.publicBaseUrl}/${key}`,

    async createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget> {
      assertKey(input.key);
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      });
      const url = await getSignedUrl(client, command, {
        expiresIn: input.expiresInSeconds,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      return {
        url,
        method: "PUT",
        headers: { "Content-Type": input.contentType },
        expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      };
    },

    async getObject(key) {
      assertKey(key);
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return (await response.Body?.transformToByteArray()) ?? null;
      } catch (error) {
        if (
          error instanceof S3ServiceException &&
          (error.name === "NoSuchKey" || error.$metadata.httpStatusCode === 404)
        ) {
          return null;
        }
        throw error;
      }
    },

    async putObject(key, body, contentType) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: IMMUTABLE_CACHE,
        }),
      );
    },

    async deleteObject(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
