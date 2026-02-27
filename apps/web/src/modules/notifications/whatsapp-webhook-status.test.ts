import { describe, expect, it, vi } from "vitest";
import {
  processMetaCloudWebhookStatusEvents,
  summarizeMetaWebhookNonMessageFields,
} from "./whatsapp-webhook-status";
import type { NotificationJobRow } from "./repository";

describe("summarizeMetaWebhookNonMessageFields", () => {
  it("resume apenas campos rastreados", () => {
    const payload = {
      entry: [
        {
          changes: [
            { field: "message_template_status_update" },
            { field: "history" },
            { field: "history" },
            { field: "messages" },
          ],
        },
      ],
    };

    const result = summarizeMetaWebhookNonMessageFields(payload);

    expect(result.totalTracked).toBe(3);
    expect(result.fields).toEqual({
      message_template_status_update: 1,
      history: 2,
    });
  });
});

describe("processMetaCloudWebhookStatusEvents", () => {
  it("marca status sem job correspondente como unmatched", async () => {
    const findNotificationJobByProviderMessageId = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const updateNotificationJobStatus = vi.fn().mockResolvedValue({ error: null });
    const logAppointmentAutomationMessage = vi.fn().mockResolvedValue(undefined);

    const result = await processMetaCloudWebhookStatusEvents(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: "wamid.1", status: "delivered", timestamp: "1700000000" }],
                },
              },
            ],
          },
        ],
      },
      {
        findNotificationJobByProviderMessageId,
        updateNotificationJobStatus,
        logAppointmentAutomationMessage,
      }
    );

    expect(result).toEqual({
      processed: 1,
      matchedJobs: 0,
      unmatched: 1,
      duplicates: 0,
    });
    expect(updateNotificationJobStatus).not.toHaveBeenCalled();
    expect(logAppointmentAutomationMessage).not.toHaveBeenCalled();
  });

  it("ignora evento duplicado de status", async () => {
    const job = {
      id: "job_1",
      status: "sent",
      tenant_id: "tenant_1",
      appointment_id: "appt_1",
      type: "appointment_created",
      payload: {
        automation: {
          meta_status_events: [
            {
              provider_message_id: "wamid.dup",
              provider_status: "delivered",
              provider_timestamp: "1700000000",
            },
          ],
        },
      },
    } as unknown as NotificationJobRow;

    const findNotificationJobByProviderMessageId = vi
      .fn()
      .mockResolvedValue({ data: job, error: null });
    const updateNotificationJobStatus = vi.fn().mockResolvedValue({ error: null });
    const logAppointmentAutomationMessage = vi.fn().mockResolvedValue(undefined);

    const result = await processMetaCloudWebhookStatusEvents(
      {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: "wamid.dup", status: "delivered", timestamp: "1700000000" }],
                },
              },
            ],
          },
        ],
      },
      {
        findNotificationJobByProviderMessageId,
        updateNotificationJobStatus,
        logAppointmentAutomationMessage,
      }
    );

    expect(result).toEqual({
      processed: 1,
      matchedJobs: 1,
      unmatched: 0,
      duplicates: 1,
    });
    expect(updateNotificationJobStatus).not.toHaveBeenCalled();
    expect(logAppointmentAutomationMessage).not.toHaveBeenCalled();
  });
});
