import { z } from "zod";

export const startAppointmentSchema = z.object({
  id: z.string().uuid(),
});

export const finishAppointmentSchema = z.object({
  id: z.string().uuid(),
});

export const cancelAppointmentSchema = z.object({
  id: z.string().uuid(),
});

export const createInternalAppointmentSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientPhone: z
    .string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 || digits.length === 11;
    }, "Telefone inválido (com DDD)"),
  addressCep: z
    .string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 8;
    }, "CEP inválido"),
  addressLogradouro: z.string().optional().nullable(),
  addressNumero: z.string().optional().nullable(),
  addressComplemento: z.string().optional().nullable(),
  addressBairro: z.string().optional().nullable(),
  addressCidade: z.string().optional().nullable(),
  addressEstado: z.string().optional().nullable(),
  addressLabel: z.string().optional().nullable(),
  clientAddressId: z.string().uuid().optional().nullable(),
  isHomeVisit: z.boolean().optional(),
  internalNotes: z.string().optional().nullable(),
  priceOverride: z.number().optional().nullable(),
  displacementFee: z.number().nonnegative().optional().nullable(),
  displacementDistanceKm: z.number().nonnegative().optional().nullable(),
  serviceId: z.string().uuid(),
  date: z.string().min(10),
  time: z.string().min(4),
});

export const publicBookingSchema = z.object({
  tenantSlug: z.string().min(1),
  serviceId: z.string().uuid(),
  date: z.string().min(10),
  time: z.string().min(4),
  clientName: z.string().min(1),
  clientPhone: z
    .string()
    .optional()
    .default("")
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 || digits.length === 11;
    }, "Telefone inválido (com DDD)"),
  addressCep: z
    .string()
    .optional()
    .default("")
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length === 8;
    }, "CEP inválido"),
  addressLogradouro: z.string().optional().default(""),
  addressNumero: z.string().optional().default(""),
  addressComplemento: z.string().optional().default(""),
  addressBairro: z.string().optional().default(""),
  addressCidade: z.string().optional().default(""),
  addressEstado: z.string().optional().default(""),
  displacementFee: z.number().nonnegative().optional().nullable(),
  displacementDistanceKm: z.number().nonnegative().optional().nullable(),
  isHomeVisit: z.boolean().optional(),
});

export const getAvailableSlotsSchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().min(10),
  isHomeVisit: z.boolean().optional(),
  ignoreBlocks: z.boolean().optional(),
});

export const finishAdminAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "cash", "card"]),
  finalAmount: z.number().nonnegative(),
  notes: z.string().optional().default(""),
  actualDurationMinutes: z.number().int().nonnegative().optional().nullable(),
});
