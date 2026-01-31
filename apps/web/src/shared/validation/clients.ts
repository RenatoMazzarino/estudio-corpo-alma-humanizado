import { z } from "zod";

function hasValidPhone(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

function hasValidCpf(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11;
}

export const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  observacoes_gerais: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  endereco_completo: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  health_tags: z.array(z.string()).optional().nullable(),
});

export const updateClientNotesSchema = z.object({
  clientId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});

export const updateClientSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional().nullable().refine(hasValidPhone, "Telefone inválido (com DDD)"),
  observacoes_gerais: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  cpf: z.string().optional().nullable().refine(hasValidCpf, "CPF inválido"),
  endereco_completo: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  health_tags: z.array(z.string()).optional().nullable(),
});
