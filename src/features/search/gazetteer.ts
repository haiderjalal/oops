import type { GeocodeResult } from "@/types/domain";

import type { GeocoderProvider } from "./types";

/**
 * OFFLINE DEVELOPMENT GAZETTEER — about 45 well-known cities, bundled in the app.
 *
 * This exists so the owner dashboard is fully usable before a real geocoding provider is
 * configured. It cannot find cafés, restaurants or street addresses: for those, set
 * MAPTILER_GEOCODING_KEY (or place the pin by hand on the map). The UI labels it plainly.
 */

type Entry = readonly [
  name: string,
  countryCode: string,
  country: string,
  lat: number,
  lng: number,
];

const CITIES: readonly Entry[] = [
  ["Lisbon", "PT", "Portugal", 38.7223, -9.1393],
  ["Porto", "PT", "Portugal", 41.1579, -8.6291],
  ["Istanbul", "TR", "Türkiye", 41.0082, 28.9784],
  ["Tokyo", "JP", "Japan", 35.6762, 139.6503],
  ["Kyoto", "JP", "Japan", 35.0116, 135.7681],
  ["Islamabad", "PK", "Pakistan", 33.6844, 73.0479],
  ["Lahore", "PK", "Pakistan", 31.5204, 74.3587],
  ["Karachi", "PK", "Pakistan", 24.8607, 67.0011],
  ["Reykjavík", "IS", "Iceland", 64.1466, -21.9426],
  ["Cape Town", "ZA", "South Africa", -33.9249, 18.4241],
  ["Cusco", "PE", "Peru", -13.532, -71.9675],
  ["Lima", "PE", "Peru", -12.0464, -77.0428],
  ["Paris", "FR", "France", 48.8566, 2.3522],
  ["London", "GB", "United Kingdom", 51.5072, -0.1276],
  ["Edinburgh", "GB", "United Kingdom", 55.9533, -3.1883],
  ["Rome", "IT", "Italy", 41.9028, 12.4964],
  ["Barcelona", "ES", "Spain", 41.3874, 2.1686],
  ["Madrid", "ES", "Spain", 40.4168, -3.7038],
  ["Berlin", "DE", "Germany", 52.52, 13.405],
  ["Amsterdam", "NL", "Netherlands", 52.3676, 4.9041],
  ["Prague", "CZ", "Czechia", 50.0755, 14.4378],
  ["Vienna", "AT", "Austria", 48.2082, 16.3738],
  ["Athens", "GR", "Greece", 37.9838, 23.7275],
  ["Santorini", "GR", "Greece", 36.3932, 25.4615],
  ["New York", "US", "United States", 40.7128, -74.006],
  ["San Francisco", "US", "United States", 37.7749, -122.4194],
  ["Los Angeles", "US", "United States", 34.0522, -118.2437],
  ["Toronto", "CA", "Canada", 43.6532, -79.3832],
  ["Vancouver", "CA", "Canada", 49.2827, -123.1207],
  ["Mexico City", "MX", "Mexico", 19.4326, -99.1332],
  ["Rio de Janeiro", "BR", "Brazil", -22.9068, -43.1729],
  ["Buenos Aires", "AR", "Argentina", -34.6037, -58.3816],
  ["Cairo", "EG", "Egypt", 30.0444, 31.2357],
  ["Marrakesh", "MA", "Morocco", 31.6295, -7.9811],
  ["Nairobi", "KE", "Kenya", -1.2921, 36.8219],
  ["Dubai", "AE", "United Arab Emirates", 25.2048, 55.2708],
  ["Mumbai", "IN", "India", 19.076, 72.8777],
  ["Delhi", "IN", "India", 28.6139, 77.209],
  ["Kathmandu", "NP", "Nepal", 27.7172, 85.324],
  ["Bangkok", "TH", "Thailand", 13.7563, 100.5018],
  ["Hanoi", "VN", "Vietnam", 21.0278, 105.8342],
  ["Singapore", "SG", "Singapore", 1.3521, 103.8198],
  ["Hong Kong", "HK", "Hong Kong", 22.3193, 114.1694],
  ["Seoul", "KR", "South Korea", 37.5665, 126.978],
  ["Sydney", "AU", "Australia", -33.8688, 151.2093],
  ["Auckland", "NZ", "New Zealand", -36.8485, 174.7633],
];

function normalise(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function createGazetteerGeocoder(): GeocoderProvider {
  return {
    name: "gazetteer",
    production: false,

    async search(query, options = {}) {
      const needle = normalise(query.trim());
      if (needle.length < 2) return [];

      return CITIES.filter(
        ([name, , country]) =>
          normalise(name).includes(needle) || normalise(country).includes(needle),
      )
        .sort(
          (a, b) =>
            Number(normalise(b[0]).startsWith(needle)) - Number(normalise(a[0]).startsWith(needle)),
        )
        .slice(0, options.limit ?? 6)
        .map(([name, countryCode, country, lat, lng]): GeocodeResult => ({
          provider: "gazetteer",
          providerPlaceId: `gazetteer:${normalise(name).replace(/\s+/g, "-")}`,
          placeName: name,
          formattedAddress: `${name}, ${country}`,
          city: name,
          region: null,
          countryCode,
          countryName: country,
          lat,
          lng,
          suggestedType: "city",
        }));
    },
  };
}
