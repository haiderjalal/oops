import { z } from "zod";

import { LOCATION_PRIVACY, PLACE_TYPES, PUBLICATION_STATUSES } from "@/types/domain";
import { isIsoDate } from "@/utils/date";
import { SLUG_PATTERN } from "@/utils/slug";

/**
 * Validation for the owner's place form. The same schema runs in the browser (instant
 * feedback) and on the server (the only check that actually protects data).
 *
 * Optional text fields are plain strings where `""` means "not set"; the service layer
 * normalises them to NULL. That keeps form state simple and the types identical on both sides.
 */

export const MAX_PHOTOS_PER_PLACE = 40;
export const MAX_TAGS_PER_PLACE = 12;

const emptyOr = <T extends z.ZodType>(schema: T) => z.union([z.literal(""), schema]);

export const slugField = z
  .string()
  .trim()
  .max(80, "Keep the web address under 80 characters.")
  .refine((value) => value === "" || SLUG_PATTERN.test(value), {
    message: "Use lowercase letters, numbers and single hyphens only.",
  });

const photoEntrySchema = z.object({
  id: z.uuid(),
  alt: z.string().trim().max(300, "Keep alt text under 300 characters."),
  caption: z.string().trim().max(300, "Keep captions under 300 characters."),
});

export const placeInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Give this place a title.")
      .max(140, "Keep the title under 140 characters."),
    slug: slugField,
    type: z.enum(PLACE_TYPES),

    lat: z.number("Pick a spot on the map.").min(-90).max(90),
    lng: z.number("Pick a spot on the map.").min(-180).max(180),
    locationPrivacy: z.enum(LOCATION_PRIVACY),

    geocoderProvider: z.string().trim().max(40),
    providerPlaceId: z.string().trim().max(200),
    placeName: z.string().trim().max(200),
    formattedAddress: z.string().trim().max(300),
    city: z.string().trim().max(120),
    region: z.string().trim().max(120),
    countryCode: emptyOr(
      z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code."),
    ),
    countryName: z.string().trim().max(120),

    visitedAt: emptyOr(z.string().refine(isIsoDate, "Use a valid date.")),
    excerpt: z.string().trim().max(280, "Keep the teaser under 280 characters."),
    story: z.string().max(20_000, "That story is longer than 20,000 characters."),
    funnyMoment: z.string().trim().max(280, "Keep the funny moment under 280 characters."),
    rating: z.number().int().min(1).max(5).nullable(),

    tripId: emptyOr(z.uuid()),
    tags: z
      .array(z.string().trim().min(1).max(32))
      .max(MAX_TAGS_PER_PLACE, `Use at most ${MAX_TAGS_PER_PLACE} tags.`),

    status: z.enum(PUBLICATION_STATUSES),
    /** Optional future date: the place goes live then (useful for "delay publishing my location"). */
    publishAt: emptyOr(z.iso.datetime({ offset: true, message: "Use a valid date and time." })),

    coverPhotoId: emptyOr(z.uuid()),
    photos: z.array(photoEntrySchema).max(MAX_PHOTOS_PER_PLACE),
  })
  .superRefine((value, ctx) => {
    const photoIds = new Set(value.photos.map((photo) => photo.id));

    if (value.coverPhotoId && !photoIds.has(value.coverPhotoId)) {
      ctx.addIssue({
        code: "custom",
        path: ["coverPhotoId"],
        message: "The cover must be one of this place's photos.",
      });
    }
    if (photoIds.size !== value.photos.length) {
      ctx.addIssue({ code: "custom", path: ["photos"], message: "A photo was added twice." });
    }

    if (value.status !== "published") return;

    if (!value.excerpt) {
      ctx.addIssue({
        code: "custom",
        path: ["excerpt"],
        message: "Add a short teaser before publishing.",
      });
    }
    value.photos.forEach((photo, index) => {
      if (!photo.alt) {
        ctx.addIssue({
          code: "custom",
          path: ["photos", index, "alt"],
          message: "Describe this photo for screen readers before publishing.",
        });
      }
    });
  });

export type PlaceInput = z.infer<typeof placeInputSchema>;

export const placeIdSchema = z.object({ id: z.uuid() });

export function emptyPlaceInput(): PlaceInput {
  return {
    title: "",
    slug: "",
    type: "city",
    lat: 20,
    lng: 0,
    locationPrivacy: "exact",
    geocoderProvider: "",
    providerPlaceId: "",
    placeName: "",
    formattedAddress: "",
    city: "",
    region: "",
    countryCode: "",
    countryName: "",
    visitedAt: "",
    excerpt: "",
    story: "",
    funnyMoment: "",
    rating: null,
    tripId: "",
    tags: [],
    status: "draft",
    publishAt: "",
    coverPhotoId: "",
    photos: [],
  };
}
