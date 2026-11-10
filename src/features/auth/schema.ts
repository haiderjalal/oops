import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").max(254),
  password: z.string().min(1, "Enter your password.").max(256),
  code: z.string().trim().max(12).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
