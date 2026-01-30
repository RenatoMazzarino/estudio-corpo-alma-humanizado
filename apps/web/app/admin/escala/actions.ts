"use server";

import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { 
  parseISO, 
  getDaysInMonth, 
  setDate, 
  startOfDay, 
  endOfDay
} from "date-fns";
import { revalidatePath } from "next/cache";

/**
 * Cria bloqueios em lote para dias pares ou ímpares de um mês específico.
 * @param type 'even' (dias pares) ou 'odd' (dias ímpares)
 * @param monthStr String no formato "YYYY-MM" (ex: "2026-02")
 */
export async function createShiftBlocks(type: 'even' | 'odd', monthStr: string) {
  const supabase = createServiceClient();
  
  // Data base: dia 1 do mês escolhido
  const baseDate = parseISO(`${monthStr}-01`);
  const totalDays = getDaysInMonth(baseDate);
  
  const blocksToInsert = [];

  for (let day = 1; day <= totalDays; day++) {
    const isEven = day % 2 === 0;
    const isOdd = !isEven;

    // Verifica se o dia corresponde ao tipo solicitado
    if ((type === 'even' && isEven) || (type === 'odd' && isOdd)) {
      const currentDay = setDate(baseDate, day);
      
      // Cria bloqueio para o dia inteiro (00:00 até 23:59:59)
      const start = startOfDay(currentDay);
      const end = endOfDay(currentDay);

      blocksToInsert.push({
        tenant_id: FIXED_TENANT_ID,
        title: 'Plantão',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reason: 'Plantão'
      });
    }
  }

  console.log(`[CreateShift] Inserting ${blocksToInsert.length} blocks for ${monthStr} (${type})`);

  if (blocksToInsert.length > 0) {
    const { error } = await supabase
      .from('availability_blocks')
      .insert(blocksToInsert);

    if (error) {
      console.error("[CreateShift] DB Error:", error);
      throw new Error(`Erro no banco: ${error.message}`);
    }
  }

  try {
      // revalidatePath('/admin/escala'); // Rota não existe
      revalidatePath('/'); 
      console.log("[CreateShift] Revalidations done");
  } catch (e) {
      console.error("[CreateShift] Revalidate Error:", e);
  }
}

/**
 * Limpa todos os bloqueios de um mês específico para o tenant atual.
 * Útil para corrigir erros de geração em lote.
 * @param monthStr String no formato "YYYY-MM" (ex: "2026-02")
 */
export async function clearMonthBlocks(monthStr: string) {
  const supabase = createServiceClient();

  const baseDate = parseISO(`${monthStr}-01`);
  const startOfMonth = startOfDay(setDate(baseDate, 1)).toISOString();
  // Pega o último dia do mês para garantir que cobrimos tudo
  const lastDay = getDaysInMonth(baseDate);
  const endOfMonth = endOfDay(setDate(baseDate, lastDay)).toISOString();

  const { error } = await supabase
    .from('availability_blocks')
    .delete()
    .eq('tenant_id', FIXED_TENANT_ID)
    .gte('start_time', startOfMonth)
    .lte('end_time', endOfMonth);

  if (error) {
    console.error("Erro ao limpar escala do mês:", error);
    throw new Error(`Erro ao limpar escala: ${error.message}`);
  }

  revalidatePath('/');
}
