/** Small, pure geography helpers. All coordinates are `[longitude, latitude]` unless a name says otherwise. */

export type LngLat = readonly [lng: number, lat: number];

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
const toDeg = (radians: number): number => (radians * 180) / Math.PI;

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

/** Decimal places kept for public "approximate" coordinates: 1 dp ≈ 11 km. */
export const APPROXIMATE_PRECISION = 1;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Public-safe coordinates for places the owner wants to keep vague. */
export function approximateCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: roundTo(lat, APPROXIMATE_PRECISION), lng: roundTo(lng, APPROXIMATE_PRECISION) };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Points along the great circle between two places, so long dashed routes curve the way real
 * flights do instead of cutting straight across a flat projection.
 */
export function greatCircle(from: LngLat, to: LngLat, steps = 48): LngLat[] {
  const [lng1, lat1] = [toRad(from[0]), toRad(from[1])];
  const [lng2, lat2] = [toRad(to[0]), toRad(to[1])];

  const delta =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    );

  if (delta === 0 || !Number.isFinite(delta)) return [from, to];

  const points: LngLat[] = [];
  let previousLng = from[0];

  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const a = Math.sin((1 - f) * delta) / Math.sin(delta);
    const b = Math.sin(f * delta) / Math.sin(delta);
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);

    let lng = toDeg(Math.atan2(y, x));
    const lat = toDeg(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)));

    // Keep longitudes continuous across the antimeridian so lines don't wrap around the globe.
    while (lng - previousLng > 180) lng -= 360;
    while (lng - previousLng < -180) lng += 360;
    previousLng = lng;

    points.push([lng, lat]);
  }
  return points;
}

/** `38.6916° N, 9.2160° W` — for display next to exact locations. */
export function formatCoordinates(lat: number, lng: number): string {
  const format = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
  return `${format(lat, "N", "S")}, ${format(lng, "E", "W")}`;
}

/** ISO 3166-1 alpha-2 → flag emoji ("PT" → 🇵🇹). Returns a globe when the code is missing/invalid. */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

/**
 * Orthographic ("globe") projection onto a unit disc, used for the static SVG globe poster.
 * Returns null for points on the far side of the planet.
 */
export function projectOrthographic(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
): { x: number; y: number } | null {
  const lambda = toRad(point.lng - center.lng);
  const phi = toRad(point.lat);
  const phi0 = toRad(center.lat);

  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  if (cosC < 0) return null;

  return {
    x: Math.cos(phi) * Math.sin(lambda),
    y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda),
  };
}
