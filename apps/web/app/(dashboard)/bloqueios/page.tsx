import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AvailabilityManager } from "../../../components/availability-manager";

export default function BloqueiosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Gestão de Agenda</h1>
      </div>
      <AvailabilityManager />
    </div>
  );
}
