import { z } from "zod";

const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format");

const addressSchema = z.object({
  line1: z.string().min(1, "Address line1 is required"),
  line2: z.string().optional(),
  line3: z.string().optional(),
  town: z.string().min(1, "Town is required"),
  county: z.string().min(1, "County is required"),
  postcode: z.string().min(1, "Postcode is required"),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: addressSchema,
  phoneNumber: phoneNumberSchema,
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  address: addressSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  email: z.string().email().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^usr-[A-Za-z0-9]+$/, "Invalid user ID format"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;