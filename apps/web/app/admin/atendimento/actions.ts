"use server";

import { createServiceClient } from "../../../lib/supabase/service";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { format } from "date-fns";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok } from "../../../src/shared/errors/result";
import { finishAdminAppointmentSchema } from "../../../src/shared/validation/appointments";

interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: 'pix' | 'cash' | 'card';
  finalAmount: number;
  notes: string;
}

export async function finishAppointment({ appointmentId, paymentMethod, finalAmount, notes }: FinishAppointmentParams) {
  const supabase = createServiceClient();

  try {
    const parsed = finishAdminAppointmentSchema.safeParse({
      appointmentId,
      paymentMethod,
      finalAmount,
      notes,
    });

    if (!parsed.success) {
      return fail(new AppError("Dados inválidos para finalização", "VALIDATION_ERROR", 400, parsed.error));
    }

    // 1. Atualizar Agendamento (Status + Financeiro)
    // Retorna client_id para podermos atualizar as notas
    const { data: updatedAppointment, error: appError } = await supabase
      .from("appointments")
      .update({
        status: 'completed',
        payment_status: 'paid', // Confirmando pagamento
        finished_at: new Date().toISOString(), // Data real de finalização
        price: parsed.data.finalAmount // Opcional: atualizar preço final se houve desconto/acréscimo
      })
      .eq("id", appointmentId)
      .eq("tenant_id", FIXED_TENANT_ID)
      .select("client_id, service_name")
      .single();

    const mappedAppError = mapSupabaseError(appError);
    if (mappedAppError || !updatedAppointment) {
      return fail(mappedAppError ?? new AppError("Agendamento não atualizado", "UNKNOWN", 500));
    }

    const { client_id, service_name } = updatedAppointment;

    // 2. Atualizar Prontuário/Notas do Cliente
    if (client_id && parsed.data.notes?.trim()) {
        // Buscar notas atuais
        const { data: clientData, error: clientFetchError } = await supabase
            .from("clients")
            .select("observacoes_gerais")
            .eq("id", client_id)
            .single();

        const mappedClientFetchError = mapSupabaseError(clientFetchError);
        if (mappedClientFetchError) return fail(mappedClientFetchError);
        
        const currentNotes = clientData?.observacoes_gerais || "";
        const dateStr = format(new Date(), "dd/MM/yyyy");
        const newEntry = `\n[${dateStr} - ${service_name}]: ${parsed.data.notes}`;
        
        // Append
        const { error: notesError } = await supabase
            .from("clients")
            .update({
                observacoes_gerais: currentNotes + newEntry
            })
            .eq("id", client_id);

        if (notesError) {
            throw new Error("Erro ao atualizar observações do cliente: " + notesError.message);
        }
    }

    // 3. Registrar Transação no Caixa
    const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
            tenant_id: FIXED_TENANT_ID,
            appointment_id: appointmentId,
            type: 'income', // Receita
            category: 'Serviço',
            description: `Recebimento Agendamento #${appointmentId.slice(0, 8)}`, // ID curto visual
            amount: parsed.data.finalAmount,
            payment_method: parsed.data.paymentMethod
        });

    if (transactionError) {
        // Não vamos falhar tudo se o log financeiro falhar, mas logamos erro
        console.error("Erro ao salvar transação:", transactionError);
        // Opcional: throw error se o financeiro for crítico
    }

    // 4. Revalidar rotas
    revalidatePath("/"); // Agenda Home
    revalidatePath("/caixa");
    
    return ok({ appointmentId });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro em finishAppointment:", error);
    return fail(new AppError(message, "UNKNOWN", 500, error));
  }
}
