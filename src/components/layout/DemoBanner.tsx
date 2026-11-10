import { getPublishedPlaces } from "@/features/places/queries";

/**
 * Honesty banner. Shown only while sample content is actually visible on the site, so nobody
 * mistakes demo pins for the owner's real travel history — and it disappears on its own the
 * moment the demo content is removed (the places query is cached and refreshed on every save).
 */
export async function DemoBanner() {
  const places = await getPublishedPlaces();
  if (!places.some((place) => place.isDemo)) return null;

  return (
    <div
      role="note"
      className="border-b border-lavender-deep/30 bg-lavender/35 px-4 py-2 text-center text-[0.8rem] font-semibold text-ink"
    >
      <span aria-hidden="true">✳ </span>
      Demo mode: places marked <span className="font-extrabold tracking-widest">DEMO</span> are
      sample content, not a real travel history.
    </div>
  );
}
