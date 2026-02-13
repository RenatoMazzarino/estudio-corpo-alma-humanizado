import { MessageCircle } from "lucide-react";
import { ModuleHeader } from "../../../components/ui/module-header";
import { ModulePage } from "../../../components/ui/module-page";

export default function MensagensPage() {
  return (
    <ModulePage
      header={<ModuleHeader title="Mensagens" subtitle="Disponível em breve." />}
      contentClassName="relative"
    >
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center opacity-70">
        <div className="w-16 h-16 bg-white border-2 border-dashed border-line rounded-full flex items-center justify-center mb-4 text-muted">
          <MessageCircle className="w-7 h-7" />
        </div>
        <h3 className="text-muted font-bold text-sm">Módulo em desenvolvimento</h3>
        <p className="text-xs text-muted mt-1">Em breve você verá novidades aqui.</p>
      </div>
    </ModulePage>
  );
}
