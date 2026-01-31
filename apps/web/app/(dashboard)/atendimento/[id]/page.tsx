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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Atendimento</h1>
          <p className="text-xs text-gray-500">Detalhes, evolução e checkout</p>
        </div>
      </div>

      <AppointmentDetailsPage appointment={appointment} />
    </div>
  );
}
