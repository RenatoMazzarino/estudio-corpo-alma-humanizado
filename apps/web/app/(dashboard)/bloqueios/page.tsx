import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AvailabilityManager } from "../../../components/availability-manager";
import { AppHeader } from "../../../components/ui/app-header";
import { ModulePage } from "../../../components/ui/module-page";

export default function BloqueiosPage() {
  return (
    <ModulePage
      className="-mx-4 -mt-4"
      header={
        <AppHeader
          label="Agenda"
          title="Gestão de Agenda"
          subtitle="Configure plantões, bloqueios pessoais e férias."
          leftSlot={
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} />
            </Link>
          }
        />
      }
    >
      <main className="p-6 pb-28">
        <AvailabilityManager />
      </main>
    </ModulePage>
  );
}
