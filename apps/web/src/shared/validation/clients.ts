import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
});

export const updateClientNotesSchema = z.object({
  clientId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});
