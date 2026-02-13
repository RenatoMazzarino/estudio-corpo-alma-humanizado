export const dynamic = "force-static";

export default function PagamentoPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] text-studio-text flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full rounded-3xl bg-white p-8 text-center shadow-2xl shadow-black/10">
        <h1 className="text-2xl font-serif font-bold mb-3">Link de pagamento em desenvolvimento</h1>
        <p className="text-sm text-muted leading-relaxed">
          Em breve você conseguirá pagar o sinal diretamente por aqui. Estamos finalizando essa
          funcionalidade para liberar o quanto antes.
        </p>
        <div className="mt-6 inline-flex items-center justify-center rounded-full bg-studio-green px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
          Em desenvolvimento
        </div>
      </div>
    </div>
  );
}
