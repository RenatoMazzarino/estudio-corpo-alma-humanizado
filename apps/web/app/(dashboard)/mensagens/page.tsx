import { loadMessagesData } from "./message-jobs";
import { MessagesRealtimeShell } from "./messages-realtime-shell";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const { jobs, appointmentsById, automationState } = await loadMessagesData();

  return (
    <MessagesRealtimeShell
      initialData={{
        jobs,
        appointments: Array.from(appointmentsById.values()),
        automationState,
        generatedAt: new Date().toISOString(),
      }}
    />
  );
}
