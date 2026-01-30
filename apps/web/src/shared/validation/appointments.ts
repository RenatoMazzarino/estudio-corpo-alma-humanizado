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
  clientName: z.string().min(1, "Nome é obrigatório"),
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
  clientPhone: z.string().optional().default(""),
  isHomeVisit: z.boolean().optional(),
});

export const getAvailableSlotsSchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().min(10),
  isHomeVisit: z.boolean().optional(),
});

export const finishAdminAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  paymentMethod: z.enum(["pix", "cash", "card"]),
  finalAmount: z.number().nonnegative(),
  notes: z.string().optional().default(""),
});
