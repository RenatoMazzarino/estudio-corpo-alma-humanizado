"use server";

import { createClient } from "../../../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { format } from "date-fns";

interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: 'pix' | 'cash' | 'card';
  finalAmount: number;
  notes: string;
}

export async function finishAppointment({ appointmentId, paymentMethod, finalAmount, notes }: FinishAppointmentParams) {
  const supabase = await createClient();

  try {
    // 1. Atualizar Agendamento (Status + Financeiro)
    // Retorna client_id para podermos atualizar as notas
    const { data: updatedAppointment, error: appError } = await supabase
      .from("appointments")
      .update({
        status: 'completed',
        payment_status: 'paid', // Confirmando pagamento
        finished_at: new Date().toISOString(), // Data real de finalização
        price: finalAmount // Opcional: atualizar preço final se houve desconto/acréscimo
      })
      .eq("id", appointmentId)
      .eq("tenant_id", FIXED_TENANT_ID)
      .select("client_id, service_name")
      .single();

    if (appError || !updatedAppointment) {
      throw new Error("Erro ao atualizar agendamento: " + appError?.message);
    }

    const { client_id, service_name } = updatedAppointment;

    // 2. Atualizar Prontuário/Notas do Cliente
    if (client_id && notes.trim()) {
        // Buscar notas atuais
        const { data: clientData } = await supabase
            .from("clients")
            .select("observacoes_gerais")
            .eq("id", client_id)
            .single();
        
        const currentNotes = clientData?.observacoes_gerais || "";
        const dateStr = format(new Date(), "dd/MM/yyyy");
        const newEntry = `\n[${dateStr} - ${service_name}]: ${notes}`;
        
        // Append
        await supabase
            .from("clients")
            .update({
                observacoes_gerais: currentNotes + newEntry
            })
            .eq("id", client_id);
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
            amount: finalAmount,
            payment_method: paymentMethod
        });

    if (transactionError) {
        // Não vamos falhar tudo se o log financeiro falhar, mas logamos erro
        console.error("Erro ao salvar transação:", transactionError);
        // Opcional: throw error se o financeiro for crítico
    }

    // 4. Revalidar rotas
    revalidatePath("/"); // Agenda Home
    revalidatePath("/admin/caixa"); // Futura tela de caixa
    
    return { success: true };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro em finishAppointment:", error);
    return { success: false, error: message };
  }
}
