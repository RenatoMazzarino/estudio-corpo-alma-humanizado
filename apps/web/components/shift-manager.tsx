"use client";

import { useEffect, useMemo, useState } from "react";
import { createShiftBlocks, clearMonthBlocks } from "../app/(dashboard)/admin/escala/actions";
import { getMonthOverview } from "../app/(dashboard)/bloqueios/actions";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Trash2 } from "lucide-react";
import { Toast, useToast } from "./ui/toast";
import { feedbackById, feedbackFromError } from "../src/shared/feedback/user-feedback";

interface MonthOverview {
  blocks: { id: string; start_time: string; end_time: string; title: string }[];
  appointments: { id: string; start_time: string; service_name: string }[];
}

export function ShiftManager() {
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), 1), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<MonthOverview>({ blocks: [], appointments: [] });
  const [pendingConfirm, setPendingConfirm] = useState<null | { type: "even" | "odd"; conflicts: { blocks: number; appointments: number } }>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    async function loadOverview() {
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    }
    loadOverview();
  }, [selectedMonth]);

  const existingBlocksCount = overview.blocks.length;
  const existingAppointmentsCount = overview.appointments.length;

  async function handleCreate(type: "even" | "odd", force?: boolean) {
    setLoading(true);
    try {
      const result = await createShiftBlocks(type, selectedMonth, force);
      if (!result.ok) {
        throw result.error;
      }
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingConfirm({ type, conflicts: result.data.conflicts });
        return;
      }
      showToast(
        feedbackById("generic_saved", {
          tone: "success",
          message: `Bloqueios criados para dias ${type === "even" ? "pares" : "ímpares"} em ${format(
            new Date(selectedMonth + "-01"),
            "MMMM/yyyy",
            { locale: ptBR }
          )}.`,
        })
      );
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      console.error(error);
      showToast(feedbackFromError(error, "agenda"));
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!confirm("Tem certeza? Isso apagará TODOS os bloqueios deste mês.")) return;

    setLoading(true);
    try {
      const result = await clearMonthBlocks(selectedMonth);
      if (!result.ok) {
        throw result.error;
      }
      showToast(feedbackById("generic_saved", { tone: "success", message: "Bloqueios do mês limpos com sucesso." }));
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      console.error(error);
      showToast(feedbackFromError(error, "agenda"));
    } finally {
      setLoading(false);
    }
  }

  const monthBlocksPreview = useMemo(() => {
    return overview.blocks.slice(0, 6);
  }, [overview.blocks]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
      <Toast toast={toast} />
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 text-studio-green rounded-lg">
          <Calendar size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Bloqueios e Plantões</h2>
          <p className="text-xs text-gray-500">Crie bloqueios em massa ou limpe o mês.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mês de Referência</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
          <div className="font-bold text-gray-700">Bloqueios existentes</div>
          <div>{existingBlocksCount} bloqueio(s)</div>
        </div>
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
          <div className="font-bold text-gray-700">Agendamentos no mês</div>
          <div>{existingAppointmentsCount} agendamento(s)</div>
        </div>
      </div>

      {monthBlocksPreview.length > 0 && (
        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 space-y-2 text-sm text-gray-600">
          <div className="text-xs font-bold uppercase text-gray-400">Bloqueios recentes</div>
          {monthBlocksPreview.map((block) => (
            <div key={block.id} className="flex items-center justify-between">
              <span>{format(new Date(block.start_time), "dd/MM", { locale: ptBR })}</span>
              <span className="text-xs text-gray-400">{block.title}</span>
            </div>
          ))}
        </div>
      )}

      {pendingConfirm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 space-y-3">
          <p className="font-bold">Existem conflitos detectados.</p>
          <p>
            {pendingConfirm.conflicts.blocks} dia(s) já estão bloqueados e {pendingConfirm.conflicts.appointments} dia(s) têm
            agendamentos.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPendingConfirm(null)}
              className="px-3 py-2 rounded-lg bg-white border border-orange-200 text-orange-700 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const type = pendingConfirm.type;
                setPendingConfirm(null);
                handleCreate(type, true);
              }}
              className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
            >
              Criar mesmo assim
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCreate("even")}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-studio-green/20 hover:border-studio-green hover:bg-green-50 transition-all text-studio-green font-bold disabled:opacity-50"
        >
          <span className="text-lg mb-1">2, 4, 6...</span>
          <span className="text-xs uppercase">Bloquear dias pares</span>
        </button>
        <button
          onClick={() => handleCreate("odd")}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-studio-green/20 hover:border-studio-green hover:bg-green-50 transition-all text-studio-green font-bold disabled:opacity-50"
        >
          <span className="text-lg mb-1">1, 3, 5...</span>
          <span className="text-xs uppercase">Bloquear dias ímpares</span>
        </button>
      </div>

      <button
        onClick={handleClear}
        disabled={loading}
        className="w-full text-red-500 hover:text-red-700 text-sm font-medium py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <Trash2 size={16} />
        Limpar bloqueios de {format(new Date(selectedMonth + "-01"), "MMMM", { locale: ptBR })}
      </button>
    </div>
  );
}
