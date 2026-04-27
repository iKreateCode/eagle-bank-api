import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  accountType: z.enum(["personal"]),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  accountType: z.enum(["personal"]).optional(),
});

export const accountNumberParamSchema = z.object({
  accountNumber: z
    .string()
    .regex(/^01\d{6}$/, "Invalid account number format"),
});
