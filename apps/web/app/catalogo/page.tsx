
import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/app-shell";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { Service } from "../../types/service";
import { CatalogoView } from "./catalogo-view";

export const dynamic = 'force-dynamic'; // Garante que a página não cacheie estaticamente dados velhos

export default async function CatalogoPage() {
  const supabase = await createClient();

  // Busca serviços do tenant
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("name", { ascending: true });

  const services = (data as Service[]) || [];

  return (
    <AppShell>
      <CatalogoView initialServices={services} />
    </AppShell>
  );
}
