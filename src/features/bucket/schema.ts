import { z } from "zod";

import { BUCKET_STATUSES } from "@/types/domain";

export const bucketItemInputSchema = z.object({
  placeName: z.string().trim().min(2, "What's the destination called?").max(160),
  lat: z.number("Pick a spot on the map.").min(-90).max(90),
  lng: z.number("Pick a spot on the map.").min(-180).max(180),
  countryCode: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code."),
  ]),
  countryName: z.string().trim().max(120),
  geocoderProvider: z.string().trim().max(40),
  providerPlaceId: z.string().trim().max(200),
  note: z.string().trim().max(400, "Keep the note under 400 characters."),
  status: z.enum(BUCKET_STATUSES),
  /** Only a published place can back a completion (see features/bucket/service.ts). */
  linkedPlaceId: z.union([z.literal(""), z.uuid()]),
});

export type BucketItemInput = z.infer<typeof bucketItemInputSchema>;

export function emptyBucketItemInput(): BucketItemInput {
  return {
    placeName: "",
    lat: 20,
    lng: 0,
    countryCode: "",
    countryName: "",
    geocoderProvider: "",
    providerPlaceId: "",
    note: "",
    status: "planned",
    linkedPlaceId: "",
  };
}
