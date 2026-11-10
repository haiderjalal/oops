"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, ImagePlus, RotateCw, Star, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";
import type { PlaceInput } from "@/features/places/schema";
import { finalizeUploadAction } from "@/features/uploads/actions";
import {
  ALLOWED_UPLOAD_TYPES,
  type AllowedUploadType,
  MAX_UPLOAD_BYTES,
} from "@/features/uploads/validation";
import type { PhotoView } from "@/types/domain";
import { cn } from "@/utils/cn";

interface UploadItem {
  key: string;
  file: File;
  progress: number;
  phase: "uploading" | "processing" | "error";
  error?: string;
}

interface PhotoManagerProps {
  form: UseFormReturn<PlaceInput>;
  /** Display data (URLs) for photos that are already attached to this place. */
  initialViews: PhotoView[];
}

function isAllowedType(type: string): type is AllowedUploadType {
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(type);
}

/** PUT the file with progress events (fetch can't report upload progress). */
function putWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${request.status}).`));
    request.onerror = () =>
      reject(new Error("The upload was interrupted. Check your connection and retry."));
    request.send(file);
  });
}

/**
 * Photos for a place: direct signed uploads with progress, alt text, captions, cover choice and
 * ordering. Originals are processed on the server (metadata stripped) — nothing here is trusted.
 */
export function PhotoManager({ form, initialViews }: PhotoManagerProps) {
  const { control, register, setValue, formState } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "photos",
    keyName: "fieldKey",
  });
  const [views, setViews] = useState(() => new Map(initialViews.map((view) => [view.id, view])));
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cover = useWatch({ control, name: "coverPhotoId" });
  const altTexts = useWatch({ control, name: "photos" });

  const patch = useCallback((key: string, change: Partial<UploadItem>) => {
    setUploads((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }, []);

  const startUpload = useCallback(
    async (file: File, existingKey?: string) => {
      const key = existingKey ?? crypto.randomUUID();
      if (existingKey) patch(key, { phase: "uploading", progress: 0 });
      else setUploads((current) => [...current, { key, file, progress: 0, phase: "uploading" }]);

      try {
        if (!isAllowedType(file.type)) throw new Error("Use a JPEG, PNG, WebP or AVIF image.");
        if (file.size > MAX_UPLOAD_BYTES)
          throw new Error(`Photos can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);

        const signResponse = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, size: file.size }),
        });
        const signed = (await signResponse.json()) as {
          uploadId?: string;
          target?: { url: string; headers: Record<string, string> };
          error?: string;
        };
        if (!signResponse.ok || !signed.uploadId || !signed.target)
          throw new Error(signed.error ?? "Couldn't start the upload.");

        await putWithProgress(signed.target.url, signed.target.headers, file, (progress) =>
          patch(key, { progress }),
        );

        patch(key, { phase: "processing", progress: 100 });
        const result = await finalizeUploadAction({ uploadId: signed.uploadId });
        if (!result.ok) throw new Error(result.error);

        setViews((current) => new Map(current).set(result.data.id, result.data));
        append({ id: result.data.id, alt: "", caption: "" });
        setUploads((current) => current.filter((item) => item.key !== key));
      } catch (error) {
        patch(key, {
          phase: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [append, patch],
  );

  function onFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) void startUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ocean/40 bg-ocean/[0.04] px-6 py-8 text-center"
      >
        <ImagePlus className="size-8 text-ocean" aria-hidden="true" />
        <p className="text-sm text-ink-soft">
          Drop photos here, or choose them. JPEG, PNG, WebP or AVIF, up to{" "}
          {MAX_UPLOAD_BYTES / 1024 / 1024} MB each.
          <br />
          Location data (GPS) is removed from every photo automatically.
        </p>
        <input
          ref={inputRef}
          id="photo-files"
          type="file"
          aria-label="Choose photos to upload"
          multiple
          accept={ALLOWED_UPLOAD_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => onFiles(event.target.files)}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose photos
        </Button>
      </div>

      {uploads.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Uploads in progress">
          {uploads.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.file.name}</p>
                {item.phase === "error" ? (
                  <p role="alert" className="font-semibold text-danger">
                    {item.error}
                  </p>
                ) : (
                  <>
                    <progress
                      className="mt-1 h-2 w-full accent-coral"
                      max={100}
                      value={item.progress}
                      aria-label={`Uploading ${item.file.name}`}
                    />
                    <p className="text-xs text-ink-muted">
                      {item.phase === "processing" ? "Processing…" : `${item.progress}%`}
                    </p>
                  </>
                )}
              </div>
              {item.phase === "error" ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void startUpload(item.file, item.key)}
                  >
                    <RotateCw className="size-4" aria-hidden="true" />
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Dismiss ${item.file.name}`}
                    onClick={() =>
                      setUploads((current) => current.filter((u) => u.key !== item.key))
                    }
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {fields.length > 0 ? (
        <ol className="flex flex-col gap-4" aria-label="Photos on this place, in display order">
          {fields.map((field, index) => {
            const view = views.get(field.id);
            const isCover = cover ? cover === field.id : index === 0;
            const altError = formState.errors.photos?.[index]?.alt?.message;

            return (
              <li key={field.fieldKey} className="postcard flex flex-col gap-4 p-4 sm:flex-row">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-parchment-deep sm:w-44">
                  {view ? (
                    <Image
                      src={view.thumbUrl}
                      alt={altTexts?.[index]?.alt || `Photo ${index + 1}, no description yet`}
                      fill
                      sizes="176px"
                      className="object-cover"
                    />
                  ) : null}
                  {isCover ? (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-sunrise px-2.5 py-1 text-xs font-extrabold text-ink">
                      <Star className="size-3 fill-current" aria-hidden="true" />
                      Cover
                    </span>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`photo-alt-${index}`} className="text-sm font-bold">
                      Describe this photo{" "}
                      <span className="font-normal text-ink-muted">
                        (alt text, for screen readers)
                      </span>
                    </label>
                    <Input
                      id={`photo-alt-${index}`}
                      {...register(`photos.${index}.alt`)}
                      aria-invalid={altError ? true : undefined}
                      aria-describedby={altError ? `photo-alt-${index}-error` : undefined}
                      placeholder="A tiny cat asleep on a sunny stone step"
                    />
                    {altError ? (
                      <p
                        id={`photo-alt-${index}-error`}
                        role="alert"
                        className="text-xs font-semibold text-danger"
                      >
                        {altError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`photo-caption-${index}`} className="text-sm font-bold">
                      Caption <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <Input
                      id={`photo-caption-${index}`}
                      {...register(`photos.${index}.caption`)}
                      placeholder="The cat is undefeated."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant={isCover ? "dark" : "secondary"}
                      size="sm"
                      aria-pressed={isCover}
                      onClick={() => setValue("coverPhotoId", field.id, { shouldDirty: true })}
                    >
                      <Star
                        className={cn("size-4", isCover && "fill-current")}
                        aria-hidden="true"
                      />
                      {isCover ? "Cover photo" : "Make cover"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      aria-label={`Move photo ${index + 1} earlier`}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === fields.length - 1}
                      aria-label={`Move photo ${index + 1} later`}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      aria-label={`Remove photo ${index + 1} from this place (it stays in your photo library)`}
                      onClick={() => {
                        if (cover === field.id) setValue("coverPhotoId", "", { shouldDirty: true });
                        remove(index);
                      }}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">
          No photos yet. Places look great with at least one — but it&rsquo;s optional.
        </p>
      )}
    </div>
  );
}
