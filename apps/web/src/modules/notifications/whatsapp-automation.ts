export type {
  LocalPollerState,
  ProcessJobsParams,
  ProcessSummary,
  QueueSource,
  ScheduleCanceledParams,
  ScheduleLifecycleParams,
} from "./whatsapp-automation.types";

export {
  processPendingWhatsAppNotificationJobs,
} from "./whatsapp-automation-processor";

export {
  enqueueNotificationJobWithAutomationGuard,
  scheduleAppointmentCanceledNotification,
  scheduleAppointmentLifecycleNotifications,
} from "./whatsapp-automation-queue";

export {
  getWhatsAppAutomationRuntimeConfig,
  startLocalWhatsAppAutomationPollerIfNeeded,
} from "./whatsapp-automation-runtime";

export {
  processMetaCloudWebhookEvents,
} from "./whatsapp-automation-webhook";

import { startLocalWhatsAppAutomationPollerIfNeeded } from "./whatsapp-automation-runtime";

startLocalWhatsAppAutomationPollerIfNeeded();
