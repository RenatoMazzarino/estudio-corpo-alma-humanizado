import { NextResponse } from "next/server";
import { addDays, subDays } from "date-fns";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { searchAppointments } from "../../../src/modules/appointments/repository";
import { createServiceClient } from "../../../lib/supabase/service";

export async function GET(request: Request) {
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
    appointmentData?.slice(0, limit).map((appointment) => ({
      id: appointment.id,
      service_name: appointment.service_name,
      start_time: appointment.start_time,
      clients: appointment.clients
        ? {
            id: appointment.clients.id,
            name: appointment.clients.name,
            phone: appointment.clients.phone ?? null,
          }
        : null,
    })) ?? [];

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
