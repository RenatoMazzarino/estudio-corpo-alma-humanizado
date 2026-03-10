export const PUSH_EVENT_TYPES = [
  "payment.created",
  "appointment.created",
  "appointment.updated",
  "appointment.canceled",
  "payment.status_changed",
  "whatsapp.job.status_changed",
] as const;

export type PushEventType = (typeof PUSH_EVENT_TYPES)[number];
