import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  health_tags: z.array(z.string()).optional().nullable(),
});

export const updateClientNotesSchema = z.object({
  clientId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});
