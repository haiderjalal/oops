import { NextResponse } from "next/server";

import { getStorageConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import { verifyUploadToken } from "@/lib/storage/uploadToken";
import { MAX_UPLOAD_BYTES } from "@/features/uploads/validation";

/**
 * Development-only upload target for the local storage driver (production uses presigned S3 URLs).
 * Authorisation is the signed token: it names exactly one key, content type and byte length, and
 * expires after a few minutes. The server later re-validates the bytes before anything is public.
 */
export async function PUT(request: Request, context: { params: Promise<{ token: string }> }) {
  if (getStorageConfig().driver !== "local") return new NextResponse(null, { status: 404 });

  const { token } = await context.params;
  const claims = await verifyUploadToken(token);
  if (!claims)
    return NextResponse.json(
      { error: "This upload link is invalid or has expired." },
      { status: 403 },
    );

  const declared = Number(request.headers.get("content-length"));
  if (
    !Number.isInteger(declared) ||
    declared !== claims.contentLength ||
    declared > MAX_UPLOAD_BYTES
  ) {
    return NextResponse.json(
      { error: "The file size doesn't match what was approved." },
      { status: 413 },
    );
  }
  if (request.headers.get("content-type")?.split(";")[0] !== claims.contentType) {
    return NextResponse.json(
      { error: "The file type doesn't match what was approved." },
      { status: 415 },
    );
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength !== claims.contentLength) {
    return NextResponse.json({ error: "The upload was incomplete." }, { status: 400 });
  }

  try {
    await getStorage().putObject(claims.key, body, claims.contentType);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    logger.error("Local upload failed", { error });
    return NextResponse.json({ error: "Couldn't store the file." }, { status: 500 });
  }
}
