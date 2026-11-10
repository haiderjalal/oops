"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { type FieldPath, Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Save, Send, Trash2 } from "lucide-react";

import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { LocationSearch } from "@/components/admin/LocationSearch";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { TagInput } from "@/components/admin/TagInput";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Skeleton } from "@/components/ui/Skeleton";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import { deletePlaceAction, savePlaceAction } from "@/features/places/actions";
import { type PlaceInput, placeInputSchema } from "@/features/places/schema";
import type { ClientMapConfig } from "@/lib/config";
import { LOCATION_PRIVACY, PLACE_TYPES, type GeocodeResult, type PhotoView } from "@/types/domain";
import { cn } from "@/utils/cn";

// The pin-placement map is MapLibre again: load it only when the editor opens.
const LocationPicker = dynamic(
  () => import("./LocationPicker").then((module) => module.LocationPicker),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72 w-full sm:h-96" />,
  },
);

interface PlaceFormProps {
  placeId?: string;
  slug?: string;
  initial: PlaceInput;
  initialPhotos: PhotoView[];
  trips: { id: string; title: string }[];
  mapConfig: ClientMapConfig;
  /** Live on the public site right now (published, schedule reached, not deleted). */
  isLive?: boolean;
  deleted?: boolean;
  isDemo?: boolean;
}

function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function PlaceForm({
  placeId,
  slug,
  initial,
  initialPhotos,
  trips,
  mapConfig,
  isLive,
  deleted,
  isDemo,
}: PlaceFormProps) {
  const router = useRouter();
  const form = useForm<PlaceInput>({
    resolver: zodResolver(placeInputSchema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const { register, control, setValue, setError, handleSubmit, formState } = form;
  const { errors, isDirty } = formState;

  const [locationSet, setLocationSet] = useState(Boolean(placeId));
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [lat, lng] = useWatch({ control, name: ["lat", "lng"] });
  const privacy = useWatch({ control, name: "locationPrivacy" });
  const excerpt = useWatch({ control, name: "excerpt" });
  const slugValue = useWatch({ control, name: "slug" });
  const geocoderProvider = useWatch({ control, name: "geocoderProvider" });
  const providerPlaceId = useWatch({ control, name: "providerPlaceId" });
  const wasPublished = initial.status === "published";

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function applyResult(result: GeocodeResult) {
    const options = { shouldDirty: true } as const;
    setValue("lat", result.lat, options);
    setValue("lng", result.lng, options);
    setValue("geocoderProvider", result.provider, options);
    setValue("providerPlaceId", result.providerPlaceId ?? "", options);
    setValue("placeName", result.placeName, options);
    setValue("formattedAddress", result.formattedAddress, options);
    setValue("city", result.city ?? "", options);
    setValue("region", result.region ?? "", options);
    setValue("countryCode", result.countryCode ?? "", options);
    setValue("countryName", result.countryName ?? "", options);
    setValue("type", result.suggestedType, options);
    if (!form.getValues("title")) setValue("title", result.placeName, options);
    setLocationSet(true);
  }

  async function save(status: "draft" | "published") {
    setNotice(null);
    setValue("status", status);

    await handleSubmit(
      async (values) => {
        if (!locationSet) {
          setError("lat", {
            message: "Search for the place or click the map to drop the pin first.",
          });
          document.getElementById("location-section")?.scrollIntoView({ block: "start" });
          return;
        }

        setSaving(status);
        const result = await savePlaceAction({ id: placeId, values: { ...values, status } });
        setSaving(null);

        if (!result.ok) {
          for (const [path, messages] of Object.entries(result.fieldErrors ?? {})) {
            if (path !== "_form")
              setError(path as FieldPath<PlaceInput>, {
                message: messages[0] ?? "Check this field.",
              });
          }
          setNotice({ tone: "error", text: result.error });
          return;
        }

        form.reset({ ...values, status, slug: result.data.slug });
        setNotice({
          tone: "ok",
          text:
            status === "published"
              ? "Saved and published. Visitors can see it now."
              : "Saved as a draft. Only you can see it.",
        });
        if (!placeId) router.replace(ROUTES.admin.editPlace(result.data.id));
        else router.refresh();
      },
      () =>
        setNotice({
          tone: "error",
          text: "A few fields need attention — they're highlighted below.",
        }),
    )();
  }

  async function remove() {
    if (!placeId) return;
    setDeleting(true);
    const result = await deletePlaceAction({ id: placeId });
    setDeleting(false);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error });
      setConfirmingDelete(false);
      return;
    }
    form.reset(undefined, { keepValues: true });
    router.push(ROUTES.admin.root);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-8" noValidate>
      {deleted ? (
        <p role="status" className="rounded-xl bg-ink/10 px-4 py-3 text-sm font-semibold">
          This place is deleted. Restore it from the dashboard to bring it back.
        </p>
      ) : null}
      {isDemo ? (
        <p
          role="note"
          className="rounded-xl bg-lavender/25 px-4 py-3 text-sm font-semibold text-ink"
        >
          This is demo content. Feel free to edit it, or remove all demo content from the dashboard.
        </p>
      ) : null}

      <Section
        id="location-section"
        title="1 · Where was it?"
        description="Search, then fine-tune the pin. The pin's coordinates are what end up on the map."
      >
        <LocationSearch onPick={applyResult} />
        <LocationPicker
          lat={lat}
          lng={lng}
          hasLocation={locationSet}
          config={mapConfig}
          onChange={(nextLat, nextLng) => {
            setValue("lat", nextLat, { shouldDirty: true });
            setValue("lng", nextLng, { shouldDirty: true });
            setLocationSet(true);
          }}
        />
        {errors.lat?.message ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.lat.message}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={errors.lat?.message} hint="−90 to 90">
            {(c) => (
              <Input
                {...c}
                type="number"
                step="any"
                inputMode="decimal"
                {...register("lat", { valueAsNumber: true, onChange: () => setLocationSet(true) })}
              />
            )}
          </Field>
          <Field label="Longitude" error={errors.lng?.message} hint="−180 to 180">
            {(c) => (
              <Input
                {...c}
                type="number"
                step="any"
                inputMode="decimal"
                {...register("lng", { valueAsNumber: true, onChange: () => setLocationSet(true) })}
              />
            )}
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold">
            How exactly should the public see this place?
          </legend>
          {LOCATION_PRIVACY.map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3",
                privacy === option ? "border-ocean bg-ocean/[0.06]" : "border-line bg-white",
              )}
            >
              <input
                type="radio"
                value={option}
                {...register("locationPrivacy")}
                className="mt-1 accent-ocean"
              />
              <span>
                <span className="block font-bold">
                  {option === "exact" ? "Exact location" : "Approximate only"}
                </span>
                <span className="block text-sm text-ink-muted">
                  {option === "exact"
                    ? "The pin, address and coordinates are shown as saved."
                    : "The public pin is rounded to roughly 10 km and the street address is hidden. Good for private spots or trips still in progress."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <details className="rounded-xl border border-line bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold">
            Location details (filled in by search, editable)
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Place name">{(c) => <Input {...c} {...register("placeName")} />}</Field>
            <Field label="City">{(c) => <Input {...c} {...register("city")} />}</Field>
            <Field label="Address" className="sm:col-span-2">
              {(c) => <Input {...c} {...register("formattedAddress")} />}
            </Field>
            <Field label="Region / state">{(c) => <Input {...c} {...register("region")} />}</Field>
            <Field label="Country">{(c) => <Input {...c} {...register("countryName")} />}</Field>
            <Field
              label="Country code"
              error={errors.countryCode?.message}
              hint="Two letters, e.g. PT"
            >
              {(c) => (
                <Input {...c} maxLength={2} className="uppercase" {...register("countryCode")} />
              )}
            </Field>
            <p className="text-xs text-ink-muted sm:col-span-2">
              Source: {geocoderProvider || "entered by hand"}
              {providerPlaceId ? ` · ${providerPlaceId}` : ""}
            </p>
          </div>
        </details>
      </Section>

      <Section title="2 · The basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required error={errors.title?.message} className="sm:col-span-2">
            {(c) => <Input {...c} {...register("title")} placeholder="Belém Tower" />}
          </Field>
          <Field label="Kind of place">
            {(c) => (
              <Select {...c} {...register("type")}>
                {PLACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PLACE_TYPE_META[type].emoji} {PLACE_TYPE_META[type].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date visited" error={errors.visitedAt?.message}>
            {(c) => <Input {...c} type="date" {...register("visitedAt")} />}
          </Field>
          <Field
            label="Web address"
            error={errors.slug?.message}
            hint={`/places/${slugValue || "…made-from-the-title"}`}
          >
            {(c) => <Input {...c} {...register("slug")} placeholder="leave empty to generate" />}
          </Field>
          <Field label="Part of a trip?">
            {(c) => (
              <Select {...c} {...register("tripId")}>
                <option value="">Not part of a trip</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-bold">Your verdict</legend>
            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {[null, 1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value ?? "none"}
                      className={cn(
                        "cursor-pointer rounded-full border px-4 py-2 text-sm font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ocean",
                        field.value === value
                          ? "border-ink bg-ink text-parchment"
                          : "border-line bg-white",
                      )}
                    >
                      <input
                        type="radio"
                        name="rating"
                        className="sr-only"
                        checked={field.value === value}
                        onChange={() => field.onChange(value)}
                      />
                      {value === null ? "No rating" : `${"★".repeat(value)}`}
                      {value !== null ? <span className="sr-only"> {value} out of 5</span> : null}
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          <Field label="Tags" className="sm:col-span-2" hint="Press Enter or comma after each tag.">
            {(c) => (
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <TagInput
                    id={c.id}
                    value={field.value}
                    onChange={field.onChange}
                    aria-describedby={c["aria-describedby"]}
                  />
                )}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="3 · The story">
        <Field
          label="Teaser"
          error={errors.excerpt?.message}
          hint={`${excerpt.length}/280 · shown on cards, the map and search results`}
        >
          {(c) => (
            <Textarea
              {...c}
              rows={2}
              maxLength={280}
              {...register("excerpt")}
              placeholder="Came for the dome. Stayed because the cats clearly run the city."
            />
          )}
        </Field>
        <Field
          label="The oops moment"
          error={errors.funnyMoment?.message}
          hint="One line of self-deprecating honesty."
        >
          {(c) => (
            <Input
              {...c}
              maxLength={280}
              {...register("funnyMoment")}
              placeholder="Lost a staring contest with a cat."
            />
          )}
        </Field>
        <Field label="Full story" error={errors.story?.message}>
          {(c) => (
            <Controller
              control={control}
              name="story"
              render={({ field }) => (
                <MarkdownEditor
                  id={c.id}
                  value={field.value}
                  onChange={field.onChange}
                  aria-describedby={c["aria-describedby"]}
                  aria-invalid={c["aria-invalid"]}
                />
              )}
            />
          )}
        </Field>
      </Section>

      <Section
        title="4 · Photos"
        description="The first photo (or the one marked Cover) represents the place on cards and the map."
      >
        <PhotoManager form={form} initialViews={initialPhotos} />
        {errors.photos?.message ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.photos.message}
          </p>
        ) : null}
      </Section>

      <Section title="5 · Publishing">
        <Field
          label="Go live at a specific time (optional)"
          hint="Leave empty to publish as soon as you press the button. A future time keeps the place hidden until then — handy for sharing a trip after you're home."
          error={errors.publishAt?.message}
        >
          {(c) => (
            <Controller
              control={control}
              name="publishAt"
              render={({ field }) => (
                <Input
                  {...c}
                  type="datetime-local"
                  value={isoToLocalInput(field.value)}
                  onChange={(event) => field.onChange(localInputToIso(event.target.value))}
                  className="max-w-xs"
                />
              )}
            />
          )}
        </Field>
        <p className="text-sm text-ink-muted">
          Status:{" "}
          <strong>
            {deleted
              ? "Deleted"
              : isLive
                ? "Live on the site"
                : wasPublished
                  ? "Scheduled"
                  : "Draft (private)"}
          </strong>
        </p>
      </Section>

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-parchment/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8">
        {wasPublished ? (
          <>
            <Button
              variant="primary"
              size="lg"
              loading={saving === "published"}
              disabled={saving !== null}
              onClick={() => save("published")}
            >
              <Save className="size-5" aria-hidden="true" />
              Save changes
            </Button>
            <Button
              variant="secondary"
              loading={saving === "draft"}
              disabled={saving !== null}
              onClick={() => save("draft")}
            >
              Move back to draft
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              loading={saving === "published"}
              disabled={saving !== null}
              onClick={() => save("published")}
            >
              <Send className="size-5" aria-hidden="true" />
              Publish
            </Button>
            <Button
              variant="secondary"
              loading={saving === "draft"}
              disabled={saving !== null}
              onClick={() => save("draft")}
            >
              Save draft
            </Button>
          </>
        )}

        {isLive && slug ? (
          <Link
            href={ROUTES.place(slug)}
            className="inline-flex items-center gap-1 text-sm font-bold text-coral-deep underline underline-offset-4"
          >
            View on site <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}

        {placeId && !deleted ? (
          <Button variant="ghost" className="ml-auto" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="size-4 text-danger" aria-hidden="true" />
            Delete
          </Button>
        ) : null}

        <div role="status" aria-live="polite" className="basis-full text-sm font-semibold">
          {notice ? (
            <p className={notice.tone === "ok" ? "text-success" : "text-danger"}>{notice.text}</p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this place?"
        className="w-[min(92vw,30rem)]"
      >
        <p className="leading-relaxed text-ink-soft">
          It leaves the public site immediately. You can restore it from the dashboard later.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" autoFocus onClick={() => setConfirmingDelete(false)}>
            Keep it
          </Button>
          <Button variant="danger" loading={deleting} onClick={remove}>
            Delete place
          </Button>
        </div>
      </Dialog>
    </form>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id ?? title}-heading`}
      className="postcard flex scroll-mt-24 flex-col gap-5 p-5 sm:p-7"
    >
      <header>
        <h2 id={`${id ?? title}-heading`} className="text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
