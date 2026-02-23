import { NextResponse } from "next/server";
import { addDays, subDays } from "date-fns";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { searchAppointments } from "../../../src/modules/appointments/repository";
import { createServiceClient } from "../../../lib/supabase/service";
import { getDashboardAccessForCurrentUser, getDashboardAuthRedirectPath } from "../../../src/modules/auth/dashboard-access";

export async function GET(request: Request) {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    const requestUrl = new URL(request.url);
    const loginPath = getDashboardAuthRedirectPath({ next: "/", reason: "forbidden" });
    return NextResponse.json(
      {
        appointments: [],
        clients: [],
        loginRequired: true,
        loginUrl: new URL(loginPath, requestUrl.origin).toString(),
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const rawLimit = Number(searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5;

  if (query.length < 3) {
    return NextResponse.json({ appointments: [], clients: [] });
  }

  const now = new Date();
  const start = subDays(now, 365).toISOString();
  const end = addDays(now, 365).toISOString();

  const { data: appointmentData } = await searchAppointments(FIXED_TENANT_ID, query, start, end);
  const appointments =
    appointmentData?.slice(0, limit).map((appointment) => {
      const client = Array.isArray(appointment.clients)
        ? appointment.clients[0] ?? null
        : appointment.clients ?? null;
      return {
        id: appointment.id,
        service_name: appointment.service_name,
        start_time: appointment.start_time,
        clients: client
          ? {
              id: client.id,
              name: client.name,
              phone: client.phone ?? null,
            }
          : null,
      };
    }) ?? [];

  const safeQuery = query.replace(/[%_,]/g, "").trim();
  const supabase = createServiceClient();
  const { data: clientsData } = await supabase
    .from("clients")
    .select("id, name, phone")
    .eq("tenant_id", FIXED_TENANT_ID)
    .ilike("name", `%${safeQuery}%`)
    .order("name")
    .limit(limit);

  return NextResponse.json({
    appointments,
    clients: clientsData ?? [],
  });
}
