"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
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

const blockTypeMeta: Record<BlockType, { label: string; color: string; icon: ReactNode }> = {
  shift: { label: "Plantão", color: "bg-purple-50 text-purple-700 border-purple-200", icon: <Stethoscope className="w-4 h-4" /> },
  personal: { label: "Pessoal", color: "bg-orange-50 text-orange-700 border-orange-200", icon: <Coffee className="w-4 h-4" /> },
  vacation: { label: "Férias", color: "bg-teal-50 text-teal-700 border-teal-200", icon: <Umbrella className="w-4 h-4" /> },
  administrative: { label: "Admin", color: "bg-gray-100 text-gray-600 border-gray-200", icon: <Shield className="w-4 h-4" /> },
};

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

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
  const [blockTitle, setBlockTitle] = useState("Novo bloqueio");
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
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonthDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonthDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonthDate]);

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
    setBlockTitle("Novo bloqueio");
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
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-studio-light text-studio-green rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-studio-text">Gestão de Agenda</h2>
            <p className="text-xs text-gray-500">Controle plantões, bloqueios pessoais e férias em um só lugar.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mês de Referência</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
            <div className="font-bold text-gray-700">Bloqueios no mês</div>
            <div>{overview.blocks.length} bloqueio(s)</div>
          </div>
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
            <div className="font-bold text-gray-700">Agendamentos no mês</div>
            <div>{overview.appointments.length} agendamento(s)</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-studio-text">Gerador de Escala</h3>
            <p className="text-xs text-gray-500">Crie plantões por dias pares/ímpares automaticamente.</p>
          </div>
          <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
            Plantões
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
          <select
            value={scaleType}
            onChange={(event) => setScaleType(event.target.value as "even" | "odd")}
            className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
          >
            <option value="even">Dias pares</option>
            <option value="odd">Dias ímpares</option>
          </select>
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

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-studio-text">Calendário do mês</h3>
            <p className="text-xs text-gray-500">Selecione um dia para ver ou adicionar bloqueios.</p>
          </div>
          <button
            onClick={openNewBlockModal}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-studio-green text-white text-xs font-bold uppercase tracking-wide shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo bloqueio
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-[10px] text-gray-400 font-bold uppercase">
          {weekdayLabels.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocks = blocksByDate.get(key) ?? [];
          const dayTypes = new Set(
            dayBlocks.map((block) => (block.block_type ?? "personal") as BlockType)
          );
          const hasShift = dayTypes.has("shift");
          const dotOrder: BlockType[] = ["shift", "personal", "vacation", "administrative"];
          const dotColors: Record<BlockType, string> = {
            shift: "bg-purple-400",
            personal: "bg-orange-400",
            vacation: "bg-teal-400",
            administrative: "bg-gray-400",
          };
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`relative h-12 rounded-xl border text-sm font-semibold transition ${
                  isSelected
                    ? "bg-studio-green text-white border-studio-green"
                    : isSameMonth(day, currentMonthDate)
                      ? "bg-stone-50 border-stone-100 text-gray-700"
                      : "bg-stone-50/60 border-stone-100 text-gray-400"
                } ${hasShift && !isSelected ? "border-purple-300 bg-purple-50 text-purple-700" : ""}`}
            >
              {format(day, "d")}
              {dayBlocks.length > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                  {dotOrder
                    .filter((type) => dayTypes.has(type))
                    .map((type) => (
                      <span key={type} className={`w-2 h-2 rounded-full ${dotColors[type]}`} />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-studio-text">
              Detalhes de {format(selectedDate, "dd MMMM", { locale: ptBR })}
            </h3>
            <p className="text-xs text-gray-500">Bloqueios cadastrados para o dia selecionado.</p>
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
                <div key={block.id} className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div>
                    <div className="text-sm font-bold text-studio-text">{block.title}</div>
                    <div className="text-xs text-gray-500">{formatBlockTime(block)}</div>
                    <span className={`inline-flex items-center gap-1 mt-2 text-[10px] px-2 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="w-9 h-9 rounded-full border border-stone-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center"
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
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-4">
              <div className="w-12 h-1.5 rounded-full bg-gray-200 mx-auto" />
              <div>
                <h3 className="text-lg font-serif font-bold text-studio-text">Novo Bloqueio</h3>
                <p className="text-xs text-gray-500">Defina o tipo e o horário do bloqueio.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Título</label>
                <input
                  value={blockTitle}
                  onChange={(event) => setBlockTitle(event.target.value)}
                  className="w-full mt-1 bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(blockTypeMeta) as BlockType[]).map((type) => {
                  const meta = blockTypeMeta[type];
                  const isActive = blockType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBlockType(type)}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        isActive ? meta.color : "border-stone-100 text-gray-400 bg-stone-50"
                      }`}
                    >
                      {meta.icon}
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span>Dia inteiro</span>
                <input
                  type="checkbox"
                  checked={blockFullDay}
                  onChange={(event) => setBlockFullDay(event.target.checked)}
                  className="w-5 h-5 accent-studio-green"
                />
              </label>

              {!blockFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Início</label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(event) => setBlockStart(event.target.value)}
                      className="w-full mt-1 bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Fim</label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(event) => setBlockEnd(event.target.value)}
                      className="w-full mt-1 bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                  </div>
                </div>
              )}

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

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-gray-500 font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCreateBlock()}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-studio-green text-white font-bold text-sm shadow-sm"
                >
                  Salvar bloqueio
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
}
