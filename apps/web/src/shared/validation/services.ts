import { z } from "zod";

const numberFromInput = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    return normalized.length > 0 ? Number(normalized) : Number.NaN;
  }
  return value;
};

const optionalNumberFromInput = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    return normalized.length > 0 ? Number(normalized) : undefined;
  }
  return value;
};

export const upsertServiceSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.preprocess(numberFromInput, z.number().nonnegative()),
  duration_minutes: z.preprocess(numberFromInput, z.number().int().positive()),
  accepts_home_visit: z.boolean(),
  buffer_before_minutes: z.preprocess(optionalNumberFromInput, z.number().int().nonnegative()).optional(),
  buffer_after_minutes: z.preprocess(optionalNumberFromInput, z.number().int().nonnegative()).optional(),
  custom_buffer_minutes: z.preprocess(optionalNumberFromInput, z.number().int().nonnegative()).optional(),
  description: z.string().optional().nullable(),
});
