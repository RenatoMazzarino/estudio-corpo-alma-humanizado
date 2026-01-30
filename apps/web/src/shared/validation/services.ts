import { z } from "zod";

export const upsertServiceSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.number().nonnegative(),
  duration_minutes: z.number().int().positive(),
  accepts_home_visit: z.boolean(),
  home_visit_fee: z.number().nonnegative(),
  custom_buffer_minutes: z.number().int().nonnegative().optional(),
  description: z.string().optional().nullable(),
});
