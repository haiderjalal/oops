import { z } from "zod";

import { PUBLICATION_STATUSES } from "@/types/domain";
import { isIsoDate } from "@/utils/date";

import { slugField } from "@/features/places/schema";

const optionalDate = z.union([z.literal(""), z.string().refine(isIsoDate, "Use a valid date.")]);

export const tripInputSchema = z
  .object({
    title: z.string().trim().min(2, "Give the trip a title.").max(120),
    slug: slugField,
    startDate: optionalDate,
    endDate: optionalDate,
    description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
    status: z.enum(PUBLICATION_STATUSES),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "The trip can't end before it starts.",
  });

export type TripInput = z.infer<typeof tripInputSchema>;

export function emptyTripInput(): TripInput {
  return { title: "", slug: "", startDate: "", endDate: "", description: "", status: "published" };
}
