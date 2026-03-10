import { NextResponse } from "next/server";
import { getDashboardAccessForCurrentUser } from "../../../../../src/modules/auth/dashboard-access";
import { loadMessagesData } from "../../../../../app/(dashboard)/mensagens/message-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobs, appointmentsById, automationState } = await loadMessagesData();
    return NextResponse.json({
      ok: true,
      data: {
        jobs,
        appointments: Array.from(appointmentsById.values()),
        automationState,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar estado do módulo de mensagens.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
