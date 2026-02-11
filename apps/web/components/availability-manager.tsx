"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Coffee,
  Plus,
  Shield,
  Stethoscope,
  Trash2,
  Umbrella,
} from "lucide-react";
import { createShiftBlocks, clearMonthBlocks } from "../app/(dashboard)/admin/escala/actions";
import { createAvailabilityBlock, deleteAvailabilityBlock, getMonthOverview } from "../app/(dashboard)/bloqueios/actions";
import { useToast } from "./ui/toast";
import { MonthCalendar } from "./agenda/month-calendar";

type BlockType = "shift" | "personal" | "vacation" | "administrative";

interface AvailabilityBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  block_type?: BlockType | string | null;
  is_full_day?: boolean | null;
}

interface MonthOverview {
  blocks: AvailabilityBlock[];
  appointments: { id: string; start_time: string; service_name: string }[];
}

interface CreateBlockPayload {
  date: string;
  title: string;
  blockType: BlockType;
  fullDay: boolean;
  startTime?: string;
  endTime?: string;
  force?: boolean;
}

const blockTypeMeta: Record<
  BlockType,
  { label: string; color: string; icon: ReactNode; iconClass: string; accentClass: string }
> = {
  shift: {
    label: "Plantão",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <Stethoscope className="w-4 h-4" />,
    iconClass: "bg-purple-100 text-purple-700",
    accentClass: "text-purple-600",
  },
  personal: {
    label: "Pessoal",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: <Coffee className="w-4 h-4" />,
    iconClass: "bg-orange-100 text-orange-700",
    accentClass: "text-orange-600",
  },
  vacation: {
    label: "Férias",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: <Umbrella className="w-4 h-4" />,
    iconClass: "bg-teal-100 text-teal-700",
    accentClass: "text-teal-600",
  },
  administrative: {
    label: "Admin",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <Shield className="w-4 h-4" />,
    iconClass: "bg-gray-100 text-gray-600",
    accentClass: "text-gray-500",
  },
};

const formatBlockTime = (block: AvailabilityBlock) => {
  if (block.is_full_day) return "Dia todo";
  const start = format(parseISO(block.start_time), "HH:mm");
  const end = format(parseISO(block.end_time), "HH:mm");
  return `${start} - ${end}`;
};

export function AvailabilityManager() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overview, setOverview] = useState<MonthOverview>({ blocks: [], appointments: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scaleType, setScaleType] = useState<"even" | "odd">("even");
  const [pendingScaleConfirm, setPendingScaleConfirm] = useState<null | { type: "even" | "odd"; appointments: number }>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("personal");
  const [blockFullDay, setBlockFullDay] = useState(true);
  const [blockStart, setBlockStart] = useState("08:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [pendingBlockConfirm, setPendingBlockConfirm] = useState<null | { payload: CreateBlockPayload; appointments: number }>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    async function loadOverview() {
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    }
    loadOverview();
  }, [selectedMonth]);

  const currentMonthDate = useMemo(() => parseISO(`${selectedMonth}-01`), [selectedMonth]);

  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonthDate)) {
      setSelectedDate(currentMonthDate);
    }
  }, [currentMonthDate, selectedDate]);
  const blocksByDate = useMemo(() => {
    const grouped = new Map<string, AvailabilityBlock[]>();
    overview.blocks.forEach((block) => {
      const key = format(parseISO(block.start_time), "yyyy-MM-dd");
      const list = grouped.get(key) ?? [];
      list.push(block);
      grouped.set(key, list);
    });
    return grouped;
  }, [overview.blocks]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedBlocks = blocksByDate.get(selectedKey) ?? [];
  const handleMonthChange = (next: Date) => {
    setSelectedMonth(format(next, "yyyy-MM"));
  };

  const handleCreateScale = async (force?: boolean) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await createShiftBlocks(scaleType, selectedMonth, force);
      if (!result.ok) throw result.error;
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingScaleConfirm({ type: scaleType, appointments: result.data.conflicts.appointments });
        return;
      }
      setMessage({
        type: "success",
        text: `Escala aplicada para dias ${scaleType === "even" ? "pares" : "ímpares"} em ${format(
          currentMonthDate,
          "MMMM/yyyy",
          { locale: ptBR }
        )}.`,
      });
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Erro ao aplicar escala: ${error instanceof Error ? error.message : "Desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearScale = async () => {
    if (!confirm("Tem certeza? Isso apagará a escala (plantões) deste mês.")) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await clearMonthBlocks(selectedMonth);
      if (!result.ok) throw result.error;
      setMessage({ type: "success", text: "Escala removida com sucesso!" });
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Erro ao limpar escala: ${error instanceof Error ? error.message : "Desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const openNewBlockModal = () => {
    setBlockTitle("");
    setBlockType("personal");
    setBlockFullDay(true);
    setBlockStart("08:00");
    setBlockEnd("12:00");
    setIsModalOpen(true);
  };

  const handleCreateBlock = async (force?: boolean, overridePayload?: CreateBlockPayload) => {
    const payload: CreateBlockPayload = overridePayload ?? {
      date: selectedKey,
      title: blockTitle.trim() || "Bloqueio",
      blockType,
      fullDay: blockFullDay,
      startTime: blockStart,
      endTime: blockEnd,
      force,
    };

    setLoading(true);
    setMessage(null);
    try {
      const result = await createAvailabilityBlock(payload);
      if (!result.ok) throw result.error;
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingBlockConfirm({ payload, appointments: result.data.conflicts.appointments });
        return;
      }
      showToast("Bloqueio registrado.", "success");
      setIsModalOpen(false);
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao criar bloqueio.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await deleteAvailabilityBlock(id);
      if (!result.ok) throw result.error;
      showToast("Bloqueio removido.", "success");
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao remover bloqueio.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
          <div className="w-8 h-8 rounded-lg bg-stone-50 text-studio-green flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resumo do mês</div>
            <div className="text-sm font-bold text-studio-text">Mês de referência</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
            Mês de referência
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-studio-green/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
            <div className="font-bold text-gray-600">Bloqueios no mês</div>
            <div>{overview.blocks.length} bloqueio(s)</div>
          </div>
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
            <div className="font-bold text-gray-600">Agendamentos no mês</div>
            <div>{overview.appointments.length} agendamento(s)</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Escala automática</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Home Care</div>
          </div>
          <span className="ml-auto text-[9px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
            Plantões
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Gere plantões em massa para dias pares ou ímpares. Bloqueios pessoais são preservados.
        </p>

        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
          <div className="relative">
            <select
              value={scaleType}
              onChange={(event) => setScaleType(event.target.value as "even" | "odd")}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 pl-3 pr-9 text-xs font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-studio-green/40 appearance-none"
            >
              <option value="even">Dias pares</option>
              <option value="odd">Dias ímpares</option>
            </select>
          </div>
          <button
            onClick={() => handleCreateScale()}
            disabled={loading}
            className="px-4 py-3 rounded-xl bg-studio-green text-white text-xs font-bold uppercase tracking-wide shadow-sm hover:bg-studio-green/90 transition disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>

        <button
          onClick={handleClearScale}
          disabled={loading}
          className="w-full text-red-500 hover:text-red-700 text-sm font-medium py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Trash2 size={16} />
          Limpar escala de {format(currentMonthDate, "MMMM", { locale: ptBR })}
        </button>

        {pendingScaleConfirm && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 space-y-3">
            <p className="font-bold">Existem agendamentos neste mês.</p>
            <p>
              {pendingScaleConfirm.appointments} dia(s) têm agendamentos. Bloquear não cancela automaticamente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingScaleConfirm(null)}
                className="px-3 py-2 rounded-lg bg-white border border-orange-200 text-orange-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                  onClick={() => {
                    setPendingScaleConfirm(null);
                    handleCreateScale(true);
                  }}
                className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
              >
                Criar mesmo assim
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-studio-green" />
            Calendário
          </div>
          <button
            onClick={openNewBlockModal}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-studio-green text-white text-xs font-bold uppercase tracking-wide shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo bloqueio
          </button>
        </div>

        <MonthCalendar
          currentMonth={currentMonthDate}
          selectedDate={selectedDate}
          onChangeMonth={(next) => handleMonthChange(next)}
          onSelectDay={(day) => setSelectedDate(day)}
          getDayTone={(day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBlocks = blocksByDate.get(key) ?? [];
            return dayBlocks.some((block) => (block.block_type ?? "personal") === "shift") ? "shift" : "none";
          }}
          getDayDots={(day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBlocks = blocksByDate.get(key) ?? [];
            const dayTypes = new Set(
              dayBlocks.map((block) => (block.block_type ?? "personal") as BlockType)
            );
            const dots = [];
            if (dayTypes.has("shift")) dots.push({ key: "shift", className: "bg-purple-500" });
            if (dayTypes.has("personal")) dots.push({ key: "personal", className: "bg-orange-500" });
            if (dayTypes.has("vacation")) dots.push({ key: "vacation", className: "bg-teal-500" });
            if (dayTypes.has("administrative")) dots.push({ key: "administrative", className: "bg-gray-400" });
            return dots;
          }}
          legend={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[9px] font-bold uppercase tracking-wide text-purple-700">Plantão</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[9px] font-bold uppercase tracking-wide text-orange-600">Parcial</span>
              </div>
            </div>
          }
          legendPlacement="top"
        />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
              <Shield className="w-4 h-4 text-gray-500" />
              Detalhes do dia
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">
              {format(selectedDate, "EEEE, dd 'de' MMM", { locale: ptBR })}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Bloqueios cadastrados para o dia selecionado.</p>
          </div>
          <button
            onClick={openNewBlockModal}
            className="px-3 py-2 rounded-full bg-studio-light text-studio-green text-xs font-bold uppercase tracking-wide"
          >
            + Novo bloqueio
          </button>
        </div>

        {selectedBlocks.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-4 text-xs text-gray-500">
            Nenhum bloqueio cadastrado para este dia.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedBlocks.map((block) => {
              const meta = blockTypeMeta[(block.block_type ?? "personal") as BlockType] ?? blockTypeMeta.personal;
              return (
                <div key={block.id} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.iconClass}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-700">{block.title}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.accentClass}`}>
                        {formatBlockTime(block)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-stone-50 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" && <CheckCircle2 size={16} />}
          {message.type === "error" && <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {isModalOpen &&
        portalTarget &&
        createPortal(
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4">
              <div className="pt-3 pb-1 flex justify-center bg-white">
                <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
              </div>

              <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-stone-50">
                <div>
                  <h2 className="text-xl font-black text-studio-dark tracking-tight">Novo Bloqueio</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                    {format(selectedDate, "EEEE, dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 bg-stone-50 rounded-full text-gray-400 flex items-center justify-center hover:bg-stone-100 hover:text-red-500 transition-colors"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-8 pb-28">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">
                    Selecione o motivo
                  </label>

                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { type: "shift", label: "Home Care", active: "ring-purple-500/50 text-purple-700 bg-purple-50 border-purple-100", idle: "border-stone-100 text-gray-400", icon: <Stethoscope className="w-6 h-6" /> },
                      { type: "personal", label: "Pessoal", active: "ring-orange-400/50 text-orange-600 bg-orange-50 border-orange-100", idle: "border-stone-100 text-gray-400", icon: <Coffee className="w-6 h-6" /> },
                      { type: "vacation", label: "Férias", active: "ring-teal-400/50 text-teal-600 bg-teal-50 border-teal-100", idle: "border-stone-100 text-gray-400", icon: <Umbrella className="w-6 h-6" /> },
                      { type: "administrative", label: "Outro", active: "ring-gray-300 text-gray-600 bg-stone-100 border-stone-200", idle: "border-stone-100 text-gray-400", icon: <Shield className="w-6 h-6" /> },
                    ] as const).map((option) => {
                      const isActive = blockType === option.type;
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => setBlockType(option.type)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div
                            className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${
                              isActive
                                ? `ring-2 ring-offset-2 ${option.active}`
                                : `bg-white ${option.idle} group-hover:bg-stone-50 group-hover:text-gray-600`
                            }`}
                          >
                            {option.icon}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                              isActive ? "text-gray-700" : "text-gray-400"
                            }`}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-700 block">Dia Inteiro</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                          Bloqueia a data completa
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlockFullDay((prev) => !prev)}
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        blockFullDay ? "bg-studio-green" : "bg-stone-300"
                      }`}
                      aria-pressed={blockFullDay}
                    >
                      <span
                        className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform ${
                          blockFullDay ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {!blockFullDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1 mb-1.5 block">
                          Início
                        </label>
                        <input
                          type="time"
                          value={blockStart}
                          onChange={(event) => setBlockStart(event.target.value)}
                          className="w-full bg-stone-50 border-0 rounded-xl py-4 pl-4 pr-3 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-studio-green/20 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1 mb-1.5 block">
                          Fim
                        </label>
                        <input
                          type="time"
                          value={blockEnd}
                          onChange={(event) => setBlockEnd(event.target.value)}
                          className="w-full bg-stone-50 border-0 rounded-xl py-4 pl-4 pr-3 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-studio-green/20 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1 mb-1.5 block">
                      Descrição (opcional)
                    </label>
                    <input
                      type="text"
                      value={blockTitle}
                      onChange={(event) => setBlockTitle(event.target.value)}
                      placeholder="Ex: Almoço com cliente"
                      className="w-full bg-white border border-stone-100 rounded-xl py-4 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-studio-green/20 placeholder-gray-300 transition-all outline-none"
                    />
                  </div>
                </div>

                {pendingBlockConfirm && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 space-y-3">
                    <p className="font-bold">Existem agendamentos no horário.</p>
                    <p>{pendingBlockConfirm.appointments} atendimento(s) serão mantidos e não serão cancelados.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingBlockConfirm(null)}
                        className="px-3 py-2 rounded-lg bg-white border border-orange-200 text-orange-700 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const payload = { ...pendingBlockConfirm.payload, force: true };
                          setPendingBlockConfirm(null);
                          handleCreateBlock(true, payload);
                        }}
                        className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold"
                      >
                        Criar mesmo assim
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-stone-50 bg-opacity-95 backdrop-blur-sm">
                <button
                  onClick={() => handleCreateBlock()}
                  disabled={loading}
                  className="w-full bg-studio-green hover:bg-studio-dark text-white h-14 rounded-2xl font-bold text-sm uppercase tracking-wide shadow-xl shadow-green-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  Confirmar bloqueio
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
}
