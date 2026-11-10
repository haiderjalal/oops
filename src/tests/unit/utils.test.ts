import { describe, expect, it } from "vitest";

import { formatDateRange, formatVisitDate, isIsoDate, yearOf } from "@/utils/date";
import {
  approximateCoordinates,
  countryFlag,
  formatCoordinates,
  greatCircle,
  haversineKm,
  isValidLatLng,
} from "@/utils/geo";
import { slugify, uniqueSlug } from "@/utils/slug";

describe("slugify", () => {
  it("makes URL-safe slugs and strips accents", () => {
    expect(slugify("Café del Mar, Ibiza")).toBe("cafe-del-mar-ibiza");
    expect(slugify("Reykjavík & Friends")).toBe("reykjavik-and-friends");
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
  });

  it("falls back when nothing usable remains", () => {
    expect(slugify("!!!", "place")).toBe("place");
    expect(slugify("日本")).toBe("untitled");
  });

  it("never exceeds 80 characters or ends with a hyphen", () => {
    const slug = slugify("a ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("finds the next free slug", async () => {
    const taken = new Set(["lisbon", "lisbon-2"]);
    expect(await uniqueSlug("lisbon", async (candidate) => taken.has(candidate))).toBe("lisbon-3");
    expect(await uniqueSlug("porto", async (candidate) => taken.has(candidate))).toBe("porto");
  });
});

describe("dates (calendar dates, UTC)", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
    expect(isIsoDate("2024-13-01")).toBe(false);
    expect(isIsoDate("24-01-01")).toBe(false);
  });

  it("formats without shifting the day across timezones", () => {
    expect(formatVisitDate("2023-03-01", "long")).toBe("1 March 2023");
    expect(formatVisitDate("2023-12-31", "short")).toBe("31 Dec 2023");
    expect(formatVisitDate("2023-03-01", "month")).toBe("March 2023");
    expect(formatVisitDate(null)).toBe("Date lost to time");
    expect(yearOf("2022-08-18")).toBe(2022);
    expect(yearOf(null)).toBeNull();
  });

  it("formats ranges", () => {
    expect(formatDateRange("2023-03-02", "2023-03-24")).toBe("2 Mar 2023 – 24 Mar 2023");
    expect(formatDateRange("2023-03-02", "2023-03-02")).toBe("2 Mar 2023");
    expect(formatDateRange(null, null)).toBeNull();
  });
});

describe("geo helpers", () => {
  it("validates coordinates", () => {
    expect(isValidLatLng(90, 180)).toBe(true);
    expect(isValidLatLng(90.1, 0)).toBe(false);
    expect(isValidLatLng(Number.NaN, 0)).toBe(false);
  });

  it("rounds approximate coordinates to roughly 11 km", () => {
    expect(approximateCoordinates(38.713912, -9.133412)).toEqual({ lat: 38.7, lng: -9.1 });
  });

  it("computes great-circle distance", () => {
    // Lisbon → Madrid is roughly 502 km.
    const km = haversineKm({ lat: 38.7223, lng: -9.1393 }, { lat: 40.4168, lng: -3.7038 });
    expect(km).toBeGreaterThan(495);
    expect(km).toBeLessThan(510);
    expect(haversineKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });

  it("interpolates great circles that stay continuous across the antimeridian", () => {
    const line = greatCircle([170, 10], [-170, 10], 20);
    expect(line[0]).toEqual([170, 10]);
    for (let i = 1; i < line.length; i += 1) {
      expect(Math.abs(line[i]![0] - line[i - 1]![0])).toBeLessThan(30); // no 360° jump
    }
    expect(line.at(-1)![0]).toBeCloseTo(190, 0);
  });

  it("handles identical endpoints", () => {
    expect(greatCircle([5, 5], [5, 5])).toEqual([
      [5, 5],
      [5, 5],
    ]);
  });

  it("formats coordinates and flags", () => {
    expect(formatCoordinates(38.6916, -9.216)).toBe("38.6916° N, 9.2160° W");
    expect(formatCoordinates(-33.9628, 18.4098)).toBe("33.9628° S, 18.4098° E");
    expect(countryFlag("pt")).toBe("🇵🇹");
    expect(countryFlag(null)).toBe("🌍");
    expect(countryFlag("xyz")).toBe("🌍");
  });
});
