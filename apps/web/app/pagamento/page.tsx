export const dynamic = "force-static";

export default function PagamentoPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-studio-text flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full rounded-3xl bg-white p-8 text-center shadow-2xl shadow-black/10">
        <h1 className="text-2xl font-serif font-bold mb-3">Abra o link completo de pagamento</h1>
        <p className="text-sm text-muted leading-relaxed">
          Este endereço precisa do identificador do agendamento no final da URL. Use o link enviado
          pelo WhatsApp para abrir o pagamento correto.
        </p>
        <div className="mt-6 inline-flex items-center justify-center rounded-full bg-studio-green px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
          Link específico do agendamento
        </div>
      </div>
    </div>
  );
}
