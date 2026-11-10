/**
 * Object-storage port. The app only ever talks to this interface, so S3, Cloudflare R2,
 * MinIO, Supabase Storage (S3 API) or the local dev driver are interchangeable.
 */

export interface UploadTarget {
  /** Where the browser sends the file. */
  url: string;
  method: "PUT";
  /** Headers the browser must send unchanged (they are part of the signature). */
  headers: Record<string, string>;
  expiresAt: string;
}

export interface CreateUploadTargetInput {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds: number;
}

export interface StorageProvider {
  readonly driver: "local" | "s3";
  /** Public (CDN) URL for an object key. Pure — never touches the network. */
  publicUrl(key: string): string;
  /** A short-lived signed target for a direct browser upload. */
  createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget>;
  getObject(key: string): Promise<Uint8Array | null>;
  putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}
