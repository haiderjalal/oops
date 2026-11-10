"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";

import { LocationSearch } from "@/components/admin/LocationSearch";
import { DemoBadge } from "@/components/shared/Stamp";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Pill } from "@/components/ui/Pill";
import { deleteBucketItemAction, saveBucketItemAction } from "@/features/bucket/actions";
import {
  type BucketItemInput,
  bucketItemInputSchema,
  emptyBucketItemInput,
} from "@/features/bucket/schema";
import { useOwnerAction } from "@/hooks/useOwnerAction";
import type { GeocodeResult } from "@/types/domain";
import { countryFlag } from "@/utils/geo";

export interface BucketListEntry {
  id: string;
  values: BucketItemInput;
  isDemo: boolean;
  /** Title of the published place a completed item is linked to, if any. */
  linkedTitle: string | null;
}

interface BucketFormProps {
  entry?: BucketListEntry;
  linkablePlaces: { id: string; title: string }[];
  onDone?: () => void;
}

function BucketForm({ entry, linkablePlaces, onDone }: BucketFormProps) {
  const { run, pending, error } = useOwnerAction();
  const form = useForm<BucketItemInput>({
    resolver: zodResolver(bucketItemInputSchema),
    defaultValues: entry?.values ?? emptyBucketItemInput(),
  });
  const { register, handleSubmit, setValue, control, formState, reset } = form;
  const { errors } = formState;
  const status = useWatch({ control, name: "status" });

  function applyResult(result: GeocodeResult) {
    setValue("placeName", result.placeName, { shouldDirty: true });
    setValue("lat", result.lat, { shouldDirty: true });
    setValue("lng", result.lng, { shouldDirty: true });
    setValue("countryCode", result.countryCode ?? "", { shouldDirty: true });
    setValue("countryName", result.countryName ?? "", { shouldDirty: true });
    setValue("geocoderProvider", result.provider, { shouldDirty: true });
    setValue("providerPlaceId", result.providerPlaceId ?? "", { shouldDirty: true });
  }

  const submit = handleSubmit((values) =>
    run(
      () => saveBucketItemAction({ id: entry?.id, values }),
      () => {
        if (!entry) reset(emptyBucketItemInput());
        onDone?.();
      },
    ),
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <LocationSearch onPick={applyResult} />
      </div>
      <Field
        label="Destination"
        required
        error={errors.placeName?.message}
        className="sm:col-span-2"
      >
        {(c) => <Input {...c} {...register("placeName")} placeholder="Torres del Paine" />}
      </Field>
      <Field label="Latitude" error={errors.lat?.message}>
        {(c) => (
          <Input {...c} type="number" step="any" {...register("lat", { valueAsNumber: true })} />
        )}
      </Field>
      <Field label="Longitude" error={errors.lng?.message}>
        {(c) => (
          <Input {...c} type="number" step="any" {...register("lng", { valueAsNumber: true })} />
        )}
      </Field>
      <Field label="Note" error={errors.note?.message} className="sm:col-span-2">
        {(c) => (
          <Textarea
            {...c}
            rows={2}
            {...register("note")}
            placeholder="Hike until my knees file a complaint."
          />
        )}
      </Field>
      <Field label="Status">
        {(c) => (
          <Select {...c} {...register("status")}>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
          </Select>
        )}
      </Field>
      {status === "completed" ? (
        <Field
          label="Journal entry"
          hint="Only a published journal entry makes this count as a visit on the passport. Without one it's just ticked off."
        >
          {(c) => (
            <Select {...c} {...register("linkedPlaceId")}>
              <option value="">No journal entry yet</option>
              {linkablePlaces.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" loading={pending}>
          {entry ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {entry ? "Save" : "Add to bucket list"}
        </Button>
      </div>
    </form>
  );
}

function BucketCard({
  entry,
  linkablePlaces,
}: {
  entry: BucketListEntry;
  linkablePlaces: { id: string; title: string }[];
}) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, error } = useOwnerAction();
  const { values } = entry;

  return (
    <li className="postcard p-5">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-xl font-bold">
            <span aria-hidden="true">{countryFlag(values.countryCode)} </span>
            {values.placeName}
          </span>
          {entry.isDemo ? <DemoBadge /> : null}
          <Pill tone={values.status === "completed" ? "ocean" : "sunrise"}>
            {values.status === "completed" ? "Completed" : "Planned"}
          </Pill>
          {values.status === "completed" ? (
            <span className="text-sm text-ink-muted">
              {entry.linkedTitle ? `Linked: ${entry.linkedTitle}` : "No journal entry"}
            </span>
          ) : null}
        </summary>
        <div className="mt-5 flex flex-col gap-4">
          <BucketForm entry={entry} linkablePlaces={linkablePlaces} />
          <div>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </details>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Remove “${values.placeName}”?`}
        className="w-[min(92vw,28rem)]"
      >
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(
                () => deleteBucketItemAction({ id: entry.id }),
                () => setConfirming(false),
              )
            }
          >
            Remove
          </Button>
        </div>
      </Dialog>
    </li>
  );
}

export function BucketManager({
  entries,
  linkablePlaces,
}: {
  entries: BucketListEntry[];
  linkablePlaces: { id: string; title: string }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-bucket" className="postcard p-6">
        <h2 id="new-bucket" className="mb-4 text-2xl">
          Add a dream destination
        </h2>
        <BucketForm linkablePlaces={linkablePlaces} />
      </section>
      <section aria-labelledby="all-bucket">
        <h2 id="all-bucket" className="mb-4 text-2xl">
          Your list
        </h2>
        {entries.length === 0 ? (
          <p className="text-ink-muted">Nothing here yet. Dream a little.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {entries.map((entry) => (
              <BucketCard key={entry.id} entry={entry} linkablePlaces={linkablePlaces} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
