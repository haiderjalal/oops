import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, MapPinPlus } from "lucide-react";

import { DemoPurgeButton } from "@/components/admin/DemoPurgeButton";
import { PlaceRowActions } from "@/components/admin/PlaceRowActions";
import { DemoBadge } from "@/components/shared/Stamp";
import { buttonStyles } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import { type AdminPlaceView, getAdminOverview, getAdminPlaces } from "@/features/admin/queries";
import { formatVisitDate } from "@/utils/date";

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const showDeleted = params.deleted === "1";
  const [overview, places] = await Promise.all([getAdminOverview(), getAdminPlaces(showDeleted)]);
  const { counts, integrations } = overview;

  const checks: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: integrations.database === "postgres",
      label:
        integrations.database === "postgres"
          ? "PostgreSQL connected"
          : "Embedded development database",
      detail:
        integrations.database === "postgres"
          ? "Content is stored in your managed PostgreSQL database."
          : "Fine for local development. Set DATABASE_URL before deploying so content survives restarts.",
    },
    {
      ok: integrations.storage === "s3",
      label: integrations.storage === "s3" ? "Object storage connected" : "Local photo storage",
      detail:
        integrations.storage === "s3"
          ? "Photos are served from your S3-compatible bucket / CDN."
          : "Photos are saved to this machine's disk. Configure S3-compatible storage for production.",
    },
    {
      ok: integrations.map === "provider",
      label: integrations.map === "provider" ? "Licensed map provider active" : "Offline atlas map",
      detail:
        integrations.map === "provider"
          ? "Streets and points of interest are shown at close zoom."
          : "Country-level only. Add MAPTILER_PUBLIC_KEY (or MAP_STYLE_URL) for streets, POIs and labels.",
    },
    {
      ok: integrations.geocoder === "maptiler",
      label:
        integrations.geocoder === "maptiler" ? "Real geocoder active" : "Offline city gazetteer",
      detail:
        integrations.geocoder === "maptiler"
          ? "Search finds cities, cafés, restaurants and street addresses."
          : "Only ~45 major cities. Add MAPTILER_GEOCODING_KEY to search real addresses and businesses.",
    },
    {
      ok: integrations.mfa,
      label: integrations.mfa ? "Two-factor sign-in on" : "Two-factor sign-in off",
      detail: integrations.mfa
        ? "Sign-in needs your password and an authenticator code."
        : "Add OWNER_TOTP_SECRET (npm run setup:owner) so a stolen password isn't enough.",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-coral-deep uppercase">
            Owner dashboard
          </p>
          <h1 className="mt-2 text-4xl">Field desk</h1>
        </div>
        <Link
          href={ROUTES.admin.newPlace}
          className={buttonStyles({ variant: "primary", size: "lg" })}
        >
          <MapPinPlus className="size-5" aria-hidden="true" />
          New place
        </Link>
      </header>

      <section aria-label="Content summary">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Tile label="Published" value={counts.published} tone="ocean" />
          <Tile label="Scheduled" value={counts.scheduled} tone="sunrise" />
          <Tile label="Drafts" value={counts.drafts} tone="coral" />
          <Tile label="Demo entries" value={counts.demo} tone="lavender" />
        </dl>
      </section>

      <section aria-labelledby="health-title" className="postcard p-6">
        <h2 id="health-title" className="text-2xl">
          Setup check
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <li key={check.label} className="flex gap-3">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="OK" />
              ) : check.label.startsWith("Offline") ||
                check.label.startsWith("Embedded") ||
                check.label.startsWith("Local") ? (
                <Info className="mt-0.5 size-5 shrink-0 text-ocean" aria-label="Note" />
              ) : (
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0 text-sunrise-deep"
                  aria-label="Attention"
                />
              )}
              <div>
                <p className="font-bold">{check.label}</p>
                <p className="text-sm leading-relaxed text-ink-muted">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        {counts.demo > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lavender-deep/30 bg-lavender/20 px-4 py-3">
            <p className="text-sm">
              <strong>
                {counts.demo} demo {counts.demo === 1 ? "entry is" : "entries are"}
              </strong>{" "}
              mixed in. Remove them once you have your own content.
            </p>
            <DemoPurgeButton count={counts.demo} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="places-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="places-title" className="text-2xl">
            All places
          </h2>
          <Link
            href={showDeleted ? ROUTES.admin.root : `${ROUTES.admin.root}?deleted=1`}
            className="text-sm font-bold text-coral-deep underline underline-offset-4"
          >
            {showDeleted ? "Hide deleted" : `Show deleted (${counts.deleted})`}
          </Link>
        </div>

        {places.length === 0 ? (
          <div className="postcard p-8 text-center">
            <p className="text-ink-soft">No places yet. Your first adventure goes here.</p>
            <Link
              href={ROUTES.admin.newPlace}
              className={buttonStyles({ variant: "primary", className: "mt-4" })}
            >
              Add your first place
            </Link>
          </div>
        ) : (
          <div className="postcard overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">All places, newest changes first</caption>
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-ink-muted uppercase">
                  <th scope="col" className="px-4 py-3 font-extrabold">
                    Place
                  </th>
                  <th scope="col" className="px-4 py-3 font-extrabold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-extrabold">
                    Visited
                  </th>
                  <th scope="col" className="px-4 py-3 font-extrabold">
                    Photos
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {places.map((place) => (
                  <PlaceRow key={place.id} place={place} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PlaceRow({ place }: { place: AdminPlaceView }) {
  const { scheduled, live } = place;

  return (
    <tr className={place.deletedAt ? "opacity-60" : undefined}>
      <th scope="row" className="px-4 py-3 font-normal">
        <Link
          href={ROUTES.admin.editPlace(place.id)}
          className="font-display text-base font-bold hover:underline"
        >
          {place.title}
        </Link>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          <span aria-hidden="true">{PLACE_TYPE_META[place.type].emoji}</span>
          {[place.city, place.countryName].filter(Boolean).join(", ") || "No location details"}
          {place.isDemo ? <DemoBadge /> : null}
        </p>
      </th>
      <td className="px-4 py-3">
        {place.deletedAt ? (
          <Pill tone="neutral">Deleted</Pill>
        ) : scheduled ? (
          <Pill tone="sunrise">Scheduled</Pill>
        ) : live ? (
          <Pill tone="ocean">Published</Pill>
        ) : (
          <Pill tone="coral">Draft</Pill>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
        {formatVisitDate(place.visitedAt, "short")}
      </td>
      <td className="px-4 py-3 text-ink-soft">{place.photoCount}</td>
      <td className="px-4 py-3">
        <PlaceRowActions
          id={place.id}
          slug={place.slug}
          title={place.title}
          deleted={Boolean(place.deletedAt)}
          live={live}
        />
      </td>
    </tr>
  );
}

const TILE_TONES = {
  ocean: "bg-ocean/10 text-ocean",
  sunrise: "bg-sunrise/30 text-sunrise-deep",
  coral: "bg-coral/15 text-coral-deep",
  lavender: "bg-lavender/25 text-lavender-deep",
} as const;

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TILE_TONES;
}) {
  return (
    <div className={`rounded-2xl p-5 ${TILE_TONES[tone]}`}>
      <dd className="font-display text-4xl leading-none font-extrabold">{value}</dd>
      <dt className="mt-2 text-xs font-extrabold tracking-wider uppercase">{label}</dt>
    </div>
  );
}
