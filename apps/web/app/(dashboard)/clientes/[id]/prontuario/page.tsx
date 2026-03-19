import Link from "next/link";
import { ChevronLeft, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { ModuleHeader } from "../../../../../components/ui/module-header";
import { ModulePage } from "../../../../../components/ui/module-page";
import { requireDashboardAccessForPage } from "../../../../../src/modules/auth/dashboard-access";
import { getClientDetailSnapshot } from "../../../../../src/modules/clients/profile-data";
import { ClientProntuarioView } from "../client-prontuario-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProntuarioPage(props: PageProps) {
  const { tenantId } = await requireDashboardAccessForPage("/clientes");
  const params = await props.params;
  const snapshot = await getClientDetailSnapshot(tenantId, params.id);

  if (!snapshot) {
    notFound();
  }

  return (
    <ModulePage
      header={
        <ModuleHeader
          kicker="Prontuário"
          title={snapshot.client.name}
          subtitle="Anamnese base e linha do tempo de evoluções de atendimento."
          rightSlot={
            <div className="flex items-center gap-2">
              <Link
                href={`/clientes/${snapshot.client.id}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-studio-light text-studio-green transition hover:bg-studio-green hover:text-white"
                aria-label="Voltar para o perfil do cliente"
                title="Voltar para o perfil do cliente"
              >
                <UserRound className="h-4 w-4" />
              </Link>
              <Link
                href="/clientes"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-studio-light text-studio-green transition hover:bg-studio-green hover:text-white"
                aria-label="Voltar para clientes"
                title="Voltar para clientes"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          }
        />
      }
    >
      <ClientProntuarioView snapshot={snapshot} />
    </ModulePage>
  );
}
