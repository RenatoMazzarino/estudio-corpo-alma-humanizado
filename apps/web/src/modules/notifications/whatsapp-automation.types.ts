import type { WhatsAppNotificationJobType } from "./whatsapp-automation.helpers";

export type QueueSource = "admin_create" | "public_booking" | "admin_cancel";

export interface ScheduleLifecycleParams {
  tenantId: string;
  appointmentId: string;
  startTimeIso: string;
  source: QueueSource;
}

export interface ScheduleCanceledParams {
  tenantId: string;
  appointmentId: string;
  source: QueueSource;
  notifyClient?: boolean;
}

export interface ProcessJobsParams {
  limit?: number;
  appointmentId?: string;
  jobId?: string;
  type?: WhatsAppNotificationJobType;
}

export interface ProcessSummary {
  enabled: boolean;
  mode: "disabled" | "dry_run" | "enabled";
  queuedEnabled: boolean;
  totalScanned: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    jobId: string;
    appointmentId: string | null;
    type: string;
    status: "sent" | "failed" | "skipped";
    reason?: string;
  }>;
}

export type LocalPollerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
};
