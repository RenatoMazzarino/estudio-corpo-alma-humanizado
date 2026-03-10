import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildAppointmentReceiptPath } from "../../../src/shared/public-links";
import {
  buildMetaPaymentLinkSampleData,
  isMetaTemplateSampleCode,
} from "../../../src/shared/meta-template-demo";
import { getPublicPaymentLinkContext } from "../../../src/modules/payments/public-payment-link";
import PaymentLinkClient from "./payment-link-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function PaymentLinkNotFound() {
  return (
    <div className="min-h-screen bg-[#f6f4f1] px-6 py-12 text-studio-text">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-4xl border border-stone-200 bg-white p-8 text-center shadow-[0_30px_80px_rgba(70,54,32,0.12)]">
          <h1 className="text-3xl font-serif font-bold">Link de pagamento não encontrado</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Não localizamos um agendamento válido para este link. Se precisar, responda a mensagem no
            WhatsApp para receber um novo link.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function PagamentoPorLinkPage(props: PageProps) {
  const params = await props.params;
  const publicId = params.id.trim();
  const mercadoPagoPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY ?? null;

  if (isMetaTemplateSampleCode(publicId)) {
    const sample = buildMetaPaymentLinkSampleData();
    return (
      <PaymentLinkClient
        publicId={publicId}
        clientName={sample.clientName}
        payerEmail="cliente+meta-demo@corpoealmahumanizado.com.br"
        serviceName={sample.serviceName}
        dateTimeLabel={sample.dateTimeLabel}
        locationLabel={sample.locationLabel}
        remainingAmount={220}
        amountLabel={sample.amountLabel}
        paidAmountLabel={sample.paidAmountLabel}
        remainingAmountLabel={sample.remainingAmountLabel}
        referenceLabel={sample.referenceLabel}
        receiptHref={`/comprovante/pagamento/${publicId}`}
        mercadoPagoPublicKey={mercadoPagoPublicKey}
        isSettled={false}
        isSample={true}
      />
    );
  }

  const context = await getPublicPaymentLinkContext(publicId);
  if (!context) {
    return <PaymentLinkNotFound />;
  }

  const startDate = new Date(context.startTime);
  const dateTimeLabel = Number.isNaN(startDate.getTime())
    ? context.startTime
    : format(startDate, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const receiptHref = buildAppointmentReceiptPath({
    appointmentId: context.appointmentId,
    attendanceCode: context.attendanceCode,
  });

  return (
    <PaymentLinkClient
      publicId={publicId}
      clientName={context.clientName}
      payerEmail={context.payerEmail}
      serviceName={context.serviceName}
      dateTimeLabel={dateTimeLabel.charAt(0).toUpperCase() + dateTimeLabel.slice(1)}
      locationLabel={context.locationLabel}
      remainingAmount={context.remainingAmount}
      amountLabel={context.amountLabel}
      paidAmountLabel={context.paidAmountLabel}
      remainingAmountLabel={context.remainingAmountLabel}
      referenceLabel={context.referenceLabel}
      receiptHref={receiptHref}
      mercadoPagoPublicKey={mercadoPagoPublicKey}
      isSettled={context.remainingAmount <= 0}
      isSample={false}
    />
  );
}
