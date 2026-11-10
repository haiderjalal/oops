"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Pill } from "@/components/ui/Pill";
import { DemoBadge } from "@/components/shared/Stamp";
import { deleteTripAction, saveTripAction } from "@/features/trips/actions";
import { type TripInput, emptyTripInput, tripInputSchema } from "@/features/trips/schema";
import { useOwnerAction } from "@/hooks/useOwnerAction";
import { formatDateRange } from "@/utils/date";

export interface TripListItem {
  id: string;
  title: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  status: "draft" | "published";
  isDemo: boolean;
  placeCount: number;
}

function TripForm({ trip, onDone }: { trip?: TripListItem; onDone?: () => void }) {
  const { run, pending, error } = useOwnerAction();
  const form = useForm<TripInput>({
    resolver: zodResolver(tripInputSchema),
    defaultValues: trip
      ? {
          title: trip.title,
          slug: trip.slug,
          startDate: trip.startDate ?? "",
          endDate: trip.endDate ?? "",
          description: trip.description,
          status: trip.status,
        }
      : emptyTripInput(),
  });
  const { register, handleSubmit, formState, reset } = form;
  const { errors } = formState;

  const submit = handleSubmit((values) =>
    run(
      () => saveTripAction({ id: trip?.id, values }),
      () => {
        if (!trip) reset(emptyTripInput());
        onDone?.();
      },
    ),
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Trip name" required error={errors.title?.message} className="sm:col-span-2">
        {(c) => <Input {...c} {...register("title")} placeholder="The Wrong Turns Tour" />}
      </Field>
      <Field label="Starts" error={errors.startDate?.message}>
        {(c) => <Input {...c} type="date" {...register("startDate")} />}
      </Field>
      <Field label="Ends" error={errors.endDate?.message}>
        {(c) => <Input {...c} type="date" {...register("endDate")} />}
      </Field>
      <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
        {(c) => <Textarea {...c} rows={2} {...register("description")} />}
      </Field>
      <Field label="Web address" error={errors.slug?.message} hint="Leave empty to generate.">
        {(c) => <Input {...c} {...register("slug")} />}
      </Field>
      <Field
        label="Visibility"
        hint="Draft trips are hidden; their places still appear, ungrouped."
      >
        {(c) => (
          <Select {...c} {...register("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        )}
      </Field>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" loading={pending}>
          {trip ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {trip ? "Save trip" : "Add trip"}
        </Button>
      </div>
    </form>
  );
}

function TripCard({ trip }: { trip: TripListItem }) {
  const [confirming, setConfirming] = useState(false);
  const { run, pending, error } = useOwnerAction();

  return (
    <li className="postcard p-5">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-xl font-bold">{trip.title}</span>
          {trip.isDemo ? <DemoBadge /> : null}
          <Pill tone={trip.status === "published" ? "ocean" : "neutral"}>
            {trip.status === "published" ? "Published" : "Draft"}
          </Pill>
          <span className="text-sm text-ink-muted">
            {formatDateRange(trip.startDate, trip.endDate) ?? "No dates"} · {trip.placeCount}{" "}
            {trip.placeCount === 1 ? "place" : "places"}
          </span>
        </summary>
        <div className="mt-5 flex flex-col gap-4">
          <TripForm trip={trip} />
          <div>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
              Delete trip
            </Button>
          </div>
        </div>
      </details>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete “${trip.title}”?`}
        className="w-[min(92vw,28rem)]"
      >
        <p className="leading-relaxed text-ink-soft">
          The trip is removed. Its {trip.placeCount} places stay — they just stop being grouped.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(
                () => deleteTripAction({ id: trip.id }),
                () => setConfirming(false),
              )
            }
          >
            Delete trip
          </Button>
        </div>
      </Dialog>
    </li>
  );
}

export function TripManager({ trips }: { trips: TripListItem[] }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-trip" className="postcard p-6">
        <h2 id="new-trip" className="mb-4 text-2xl">
          Add a trip
        </h2>
        <TripForm />
      </section>
      <section aria-labelledby="all-trips">
        <h2 id="all-trips" className="mb-4 text-2xl">
          All trips
        </h2>
        {trips.length === 0 ? (
          <p className="text-ink-muted">
            No trips yet. Trips group places on the timeline and draw dashed routes on the globe.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
