import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { getAppointmentById } from "../../../../src/modules/appointments/repository";
import { AppointmentDetailsPage } from "./appointment-details-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AtendimentoPage(props: PageProps) {
  const params = await props.params;
  const { data: appointment } = await getAppointmentById(FIXED_TENANT_ID, params.id);

  if (!appointment) {
    return notFound();
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft size={16} />
        Voltar
      </Link>
      <AppointmentDetailsPage appointment={appointment} />
    </div>
  );
}
