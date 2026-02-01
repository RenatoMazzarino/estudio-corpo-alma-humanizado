import { z } from "zod";

export const appointmentIdSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const confirmPreSchema = appointmentIdSchema.extend({
  channel: z.string().min(1).optional(),
});

export const internalNotesSchema = appointmentIdSchema.extend({
  internalNotes: z.string().optional().nullable(),
});

export const checklistToggleSchema = appointmentIdSchema.extend({
  itemId: z.string().uuid(),
  completed: z.boolean(),
});

export const checklistUpsertSchema = appointmentIdSchema.extend({
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().min(1),
        sortOrder: z.number().int().nonnegative(),
        completed: z.boolean().optional(),
      })
    )
    .min(1),
});

const evolutionPayload = z.object({
  summary: z.string().optional().nullable(),
  complaint: z.string().optional().nullable(),
  techniques: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  sectionsJson: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const saveEvolutionSchema = appointmentIdSchema.extend({
  payload: evolutionPayload,
  status: z.enum(["draft", "published"]),
});

export const setCheckoutItemsSchema = appointmentIdSchema.extend({
  items: z
    .array(
      z.object({
        type: z.enum(["service", "fee", "addon", "adjustment"]),
        label: z.string().min(1),
        qty: z.number().int().positive().optional(),
        amount: z.number().nonnegative(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1),
});

export const setDiscountSchema = appointmentIdSchema.extend({
  type: z.enum(["value", "pct"]).nullable(),
  value: z.number().nonnegative().nullable(),
  reason: z.string().optional().nullable(),
});

export const recordPaymentSchema = appointmentIdSchema.extend({
  method: z.enum(["pix", "card", "cash", "other"]),
  amount: z.number().positive(),
  transactionId: z.string().uuid().optional().nullable(),
});

export const timerStartSchema = appointmentIdSchema.extend({
  plannedSeconds: z.number().int().positive().optional().nullable(),
});

export const timerPauseSchema = appointmentIdSchema;
export const timerResumeSchema = appointmentIdSchema;

export const timerSyncSchema = appointmentIdSchema.extend({
  timerStatus: z.enum(["idle", "running", "paused", "finished"]),
  timerStartedAt: z.string().datetime().nullable(),
  timerPausedAt: z.string().datetime().nullable(),
  pausedTotalSeconds: z.number().int().nonnegative(),
  plannedSeconds: z.number().int().positive().nullable(),
  actualSeconds: z.number().int().nonnegative().optional().nullable(),
});

export const savePostSchema = appointmentIdSchema.extend({
  postNotes: z.string().optional().nullable(),
  followUpDueAt: z.string().datetime().optional().nullable(),
  followUpNote: z.string().optional().nullable(),
  surveyStatus: z.enum(["not_sent", "sent", "answered"]).optional(),
  surveyScore: z.number().int().min(0).max(10).optional().nullable(),
  kpiTotalSeconds: z.number().int().nonnegative().optional().nullable(),
});

export const finishAttendanceSchema = appointmentIdSchema;
