"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Coffee,
  Sparkles,
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

export interface AvailabilityManagerHandle {
  openBlockModal: (date?: Date) => void;
}

interface AvailabilityBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  block_type?: BlockType | string | null;
  is_full_day?: boolean | null;
  reason?: string | null;
}

interface MonthOverview {
  blocks: AvailabilityBlock[];
  appointments: { id: string; start_time: string; service_name: string; is_home_visit?: boolean | null }[];
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
    color: "bg-red-50 text-red-600 border-red-100",
    icon: <Stethoscope className="w-4 h-4" />,
    iconClass: "bg-red-100 text-red-600",
    accentClass: "text-red-600",
  },
  personal: {
    label: "Pessoal",
    color: "bg-amber-50 text-amber-700 border-amber-100",
    icon: <Coffee className="w-4 h-4" />,
    iconClass: "bg-amber-100 text-amber-700",
    accentClass: "text-amber-600",
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

export const AvailabilityManager = forwardRef<AvailabilityManagerHandle>(function AvailabilityManager(_, ref) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overview, setOverview] = useState<MonthOverview>({ blocks: [], appointments: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scaleType, setScaleType] = useState<"even" | "odd">("even");
  const [pendingScaleConfirm, setPendingScaleConfirm] = useState<null | { type: "even" | "odd"; appointments: number }>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [scaleMonth, setScaleMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [blockTitle, setBlockTitle] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("personal");
  const [blockFullDay, setBlockFullDay] = useState(true);
  const [blockStart, setBlockStart] = useState("08:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [pendingBlockConfirm, setPendingBlockConfirm] = useState<null | { payload: CreateBlockPayload; appointments: number }>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [blockDragOffset, setBlockDragOffset] = useState(0);
  const [isBlockDragging, setIsBlockDragging] = useState(false);
  const [scaleDragOffset, setScaleDragOffset] = useState(0);
  const [isScaleDragging, setIsScaleDragging] = useState(false);
  const [scaleMonthOverview, setScaleMonthOverview] = useState<MonthOverview | null>(null);
  const [isScaleOverviewLoading, setIsScaleOverviewLoading] = useState(false);
  const { showToast } = useToast();
  const blockSheetRef = useRef<HTMLDivElement | null>(null);
  const scaleSheetRef = useRef<HTMLDivElement | null>(null);
  const blockDragStartRef = useRef<number | null>(null);
  const scaleDragStartRef = useRef<number | null>(null);
  const blockDragOffsetRef = useRef(0);
  const scaleDragOffsetRef = useRef(0);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      resetBlockDrag();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!isScaleModalOpen) {
      resetScaleDrag();
    }
  }, [isScaleModalOpen]);

  useEffect(() => {
    async function loadOverview() {
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    }
    loadOverview();
  }, [selectedMonth]);

  useEffect(() => {
    if (!isScaleModalOpen) return;
    let active = true;
    const loadScaleOverview = async () => {
      if (scaleMonth === selectedMonth) {
        setScaleMonthOverview(overview);
        return;
      }
      setIsScaleOverviewLoading(true);
      try {
        const data = await getMonthOverview(scaleMonth);
        if (active) setScaleMonthOverview(data);
      } finally {
        if (active) setIsScaleOverviewLoading(false);
      }
    };
    loadScaleOverview();
    return () => {
      active = false;
    };
  }, [isScaleModalOpen, scaleMonth, selectedMonth, overview]);

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

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, MonthOverview["appointments"]>();
    overview.appointments.forEach((appt) => {
      const key = format(parseISO(appt.start_time), "yyyy-MM-dd");
      const list = grouped.get(key) ?? [];
      list.push(appt);
      grouped.set(key, list);
    });
    return grouped;
  }, [overview.appointments]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedBlocks = blocksByDate.get(selectedKey) ?? [];
  const blockDateLabel = useMemo(() => {
    if (!blockDate) return format(selectedDate, "EEEE, dd 'de' MMM", { locale: ptBR });
    const parsed = parseISO(`${blockDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return format(selectedDate, "EEEE, dd 'de' MMM", { locale: ptBR });
    }
    return format(parsed, "EEEE, dd 'de' MMM", { locale: ptBR });
  }, [blockDate, selectedDate]);
  const scaleHasShiftBlocks = useMemo(() => {
    const blocks = scaleMonthOverview?.blocks ?? [];
    return blocks.some((block) => block.block_type === "shift");
  }, [scaleMonthOverview]);
  const handleMonthChange = (next: Date) => {
    setSelectedMonth(format(next, "yyyy-MM"));
  };

  const openScaleModal = () => {
    setScaleMonth(selectedMonth);
    setPendingScaleConfirm(null);
    setIsScaleModalOpen(true);
  };

  const runCreateScale = async (type: "even" | "odd", monthStr: string, force?: boolean) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await createShiftBlocks(type, monthStr, force);
      if (!result.ok) throw result.error;
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingScaleConfirm({ type, appointments: result.data.conflicts.appointments });
        return;
      }
      setMessage({
        type: "success",
        text: `Escala aplicada para dias ${type === "even" ? "pares" : "ímpares"} em ${format(
          parseISO(`${monthStr}-01`),
          "MMMM/yyyy",
          { locale: ptBR }
        )}.`,
      });
      setSelectedMonth(monthStr);
      const data = await getMonthOverview(monthStr);
      setOverview(data);
      setIsScaleModalOpen(false);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Erro ao aplicar escala: ${error instanceof Error ? error.message : "Desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearScale = async (monthStr: string, keepOpen = false) => {
    if (!confirm("Tem certeza? Isso apagará a escala (plantões) deste mês.")) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await clearMonthBlocks(monthStr);
      if (!result.ok) throw result.error;
      setMessage({ type: "success", text: "Escala removida com sucesso!" });
      const data = await getMonthOverview(monthStr);
      if (monthStr === selectedMonth) {
        setOverview(data);
      }
      setScaleMonthOverview(data);
      if (!keepOpen) {
        setIsScaleModalOpen(false);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Erro ao limpar escala: ${error instanceof Error ? error.message : "Desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  };


  const resetBlockDrag = () => {
    blockDragStartRef.current = null;
    blockDragOffsetRef.current = 0;
    setBlockDragOffset(0);
    setIsBlockDragging(false);
  };

  const handleBlockDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    blockDragStartRef.current = event.clientY;
    blockDragOffsetRef.current = 0;
    setIsBlockDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleBlockDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (blockDragStartRef.current === null) return;
    const delta = Math.max(0, event.clientY - blockDragStartRef.current);
    blockDragOffsetRef.current = delta;
    setBlockDragOffset(delta);
  };

  const handleBlockDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (blockDragStartRef.current === null) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const sheetHeight = blockSheetRef.current?.getBoundingClientRect().height ?? 0;
    const threshold = Math.max(80, sheetHeight * 0.25);
    const finalOffset = blockDragOffsetRef.current;
    if (finalOffset > threshold) {
      resetBlockDrag();
      setIsModalOpen(false);
      return;
    }
    resetBlockDrag();
  };

  const resetScaleDrag = () => {
    scaleDragStartRef.current = null;
    scaleDragOffsetRef.current = 0;
    setScaleDragOffset(0);
    setIsScaleDragging(false);
  };

  const handleScaleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    scaleDragStartRef.current = event.clientY;
    scaleDragOffsetRef.current = 0;
    setIsScaleDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleScaleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scaleDragStartRef.current === null) return;
    const delta = Math.max(0, event.clientY - scaleDragStartRef.current);
    scaleDragOffsetRef.current = delta;
    setScaleDragOffset(delta);
  };

  const handleScaleDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scaleDragStartRef.current === null) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const sheetHeight = scaleSheetRef.current?.getBoundingClientRect().height ?? 0;
    const threshold = Math.max(80, sheetHeight * 0.25);
    const finalOffset = scaleDragOffsetRef.current;
    if (finalOffset > threshold) {
      resetScaleDrag();
      setIsScaleModalOpen(false);
      return;
    }
    resetScaleDrag();
  };

  useImperativeHandle(
    ref,
    () => ({
      openBlockModal: (date?: Date) => {
        const baseDate = date ?? selectedDate;
        setBlockDate(format(baseDate, "yyyy-MM-dd"));
        if (date) {
          setSelectedDate(date);
        }
        setBlockTitle("");
        setBlockType("personal");
        setBlockFullDay(true);
        setBlockStart("08:00");
        setBlockEnd("12:00");
        setIsModalOpen(true);
      },
    }),
    [selectedDate]
  );

  const handleCreateBlock = async (force?: boolean, overridePayload?: CreateBlockPayload) => {
    const payload: CreateBlockPayload = overridePayload ?? {
      date: blockDate || selectedKey,
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

      <MonthCalendar
        currentMonth={currentMonthDate}
        selectedDate={selectedDate}
        onChangeMonth={(next) => handleMonthChange(next)}
        onSelectDay={(day) => setSelectedDate(day)}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openScaleModal}
              className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition shadow-sm"
              aria-label="Gerador de escala"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        }
        getDayTone={(day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocks = blocksByDate.get(key) ?? [];
          return dayBlocks.some((block) => (block.block_type ?? "personal") === "shift") ? "shift" : "none";
        }}
        getDayDots={(day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocks = blocksByDate.get(key) ?? [];
          const dayAppointments = appointmentsByDate.get(key) ?? [];
          const hasHome = dayAppointments.some((appt) => appt.is_home_visit);
          const hasAppointments = dayAppointments.length > 0;
          const dayTypes = new Set(
            dayBlocks.map((block) => (block.block_type ?? "personal") as BlockType)
          );
          const dots = [];
          if (hasAppointments) dots.push({ key: "appointments", className: "bg-studio-green" });
          if (hasHome) dots.push({ key: "home", className: "bg-purple-400" });
          if (dayTypes.has("shift")) dots.push({ key: "shift", className: "bg-red-500" });
          if (dayTypes.has("personal")) dots.push({ key: "personal", className: "bg-amber-500" });
          if (dayTypes.has("vacation")) dots.push({ key: "vacation", className: "bg-teal-500" });
          if (dayTypes.has("administrative")) dots.push({ key: "administrative", className: "bg-gray-400" });
          return dots;
        }}
        legend={
          <div className="flex justify-center">
            <div className="flex flex-wrap items-center gap-3 rounded-full bg-stone-50 border border-stone-100 px-4 py-2 text-[11px] text-muted">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Legenda:</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-studio-green" />
                atendimentos
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                domicílio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                plantão
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                parcial
              </span>
            </div>
          </div>
        }
        legendPlacement="bottom"
        footer={
          <div className="space-y-4">
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

            {selectedBlocks.length === 0 ? (
              <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-4 text-xs text-gray-500">
                Nenhum bloqueio cadastrado para este dia.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedBlocks.map((block) => {
                  const meta = blockTypeMeta[(block.block_type ?? "personal") as BlockType] ?? blockTypeMeta.personal;
                  const timeClass = block.is_full_day ? meta.accentClass : "text-amber-600";
                  return (
                    <div key={block.id} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.iconClass}`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700">{block.title}</div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${timeClass}`}>
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
        }
      />

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
            <div
              ref={blockSheetRef}
              style={{
                transform: `translateY(${blockDragOffset}px)`,
                transition: isBlockDragging ? "none" : "transform 0.2s ease",
              }}
              className="w-full max-w-md bg-white rounded-t-4xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4"
            >
              <div
                className="pt-3 pb-1 flex justify-center bg-white cursor-grab active:cursor-grabbing"
                onPointerDown={handleBlockDragStart}
                onPointerMove={handleBlockDragMove}
                onPointerUp={handleBlockDragEnd}
                onPointerCancel={handleBlockDragEnd}
              >
                <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
              </div>

              <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-stone-50">
                <div>
                  <h2 className="text-xl font-black text-studio-dark tracking-tight">Novo Bloqueio</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                    {blockDateLabel}
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

              <div className="overflow-y-auto p-6 space-y-6 pb-28">
                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <Shield className="w-3.5 h-3.5" />
                    Motivo
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { type: "shift", label: "Home Care", active: "ring-purple-500/50 text-purple-700 bg-purple-50 border-purple-100", idle: "border-stone-100 text-gray-400", icon: <Stethoscope className="w-6 h-6" /> },
                      { type: "personal", label: "Pessoal", active: "ring-amber-400/50 text-amber-600 bg-amber-50 border-amber-100", idle: "border-stone-100 text-gray-400", icon: <Coffee className="w-6 h-6" /> },
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
                </section>

                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    Horário
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1 mb-1.5 block">
                      Dia do bloqueio
                    </label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(event) => setBlockDate(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-1 focus:ring-studio-green/40 outline-none"
                    />
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-studio-light text-studio-green flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-studio-text block">Dia Inteiro</span>
                          <span className="text-[10px] text-muted font-bold uppercase tracking-wide">
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
                            className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-3 px-4 text-base font-bold text-gray-800 focus:ring-2 focus:ring-studio-green/20 outline-none"
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
                            className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-3 px-4 text-base font-bold text-gray-800 focus:ring-2 focus:ring-studio-green/20 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Detalhes
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1 mb-1.5 block">
                      Título do bloqueio
                    </label>
                    <input
                      type="text"
                      value={blockTitle}
                      onChange={(event) => setBlockTitle(event.target.value)}
                      placeholder="Ex: Plantão Home Care"
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-studio-green/20 placeholder-gray-300 transition-all outline-none"
                    />
                  </div>
                </section>

                {pendingBlockConfirm && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-3">
                    <p className="font-bold">Existem agendamentos no horário.</p>
                    <p>{pendingBlockConfirm.appointments} atendimento(s) serão mantidos e não serão cancelados.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingBlockConfirm(null)}
                        className="px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const payload = { ...pendingBlockConfirm.payload, force: true };
                          setPendingBlockConfirm(null);
                          handleCreateBlock(true, payload);
                        }}
                        className="px-3 py-1.5 rounded-full bg-studio-text text-white text-[10px] font-extrabold uppercase tracking-wide"
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

      {isScaleModalOpen &&
        portalTarget &&
        createPortal(
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in">
            <div
              ref={scaleSheetRef}
              style={{
                transform: `translateY(${scaleDragOffset}px)`,
                transition: isScaleDragging ? "none" : "transform 0.2s ease",
              }}
              className="w-full max-w-md bg-white rounded-t-4xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4"
            >
              <div
                className="pt-3 pb-1 flex justify-center bg-white cursor-grab active:cursor-grabbing"
                onPointerDown={handleScaleDragStart}
                onPointerMove={handleScaleDragMove}
                onPointerUp={handleScaleDragEnd}
                onPointerCancel={handleScaleDragEnd}
              >
                <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
              </div>

              <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-stone-50">
                <div>
                  <h2 className="text-xl font-black text-studio-dark tracking-tight">Gerador Automático</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                    Defina o mês e o padrão da escala
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScaleModalOpen(false)}
                  className="w-9 h-9 bg-stone-50 rounded-full text-gray-400 flex items-center justify-center hover:bg-stone-100 hover:text-red-500 transition-colors"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6 pb-28">
                <section>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    Mês da escala
                  </div>
                  <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm">
                    <input
                      type="month"
                      value={scaleMonth}
                      onChange={(event) => setScaleMonth(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-studio-green/40"
                    />
                  </div>
                </section>

                {isScaleOverviewLoading ? (
                  <div className="text-xs text-muted">Carregando escala do mês...</div>
                ) : scaleHasShiftBlocks ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-3">
                    <p className="font-bold">Já existe uma escala cadastrada nesse mês.</p>
                    <p>Deseja apagar a escala atual para gerar uma nova?</p>
                    <button
                      type="button"
                      onClick={() => handleClearScale(scaleMonth, true)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-[10px] font-extrabold uppercase tracking-wide hover:bg-red-200 transition disabled:opacity-60"
                    >
                      Apagar escala
                    </button>
                  </div>
                ) : (
                  <section>
                    <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
                      <Sparkles className="w-3.5 h-3.5" />
                      Padrão de plantão
                    </div>
                    <div className="bg-white rounded-2xl border border-line px-4 py-3 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setScaleType("odd")}
                          className={`px-3 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition ${
                            scaleType === "odd"
                              ? "bg-studio-text text-white border-studio-text"
                              : "bg-white text-gray-400 border-stone-100"
                          }`}
                        >
                          Bloquear dias ímpares
                        </button>
                        <button
                          type="button"
                          onClick={() => setScaleType("even")}
                          className={`px-3 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition ${
                            scaleType === "even"
                              ? "bg-studio-text text-white border-studio-text"
                              : "bg-white text-gray-400 border-stone-100"
                          }`}
                        >
                          Bloquear dias pares
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {pendingScaleConfirm && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-3">
                    <p className="font-bold">Existem agendamentos neste mês.</p>
                    <p>
                      {pendingScaleConfirm.appointments} dia(s) têm agendamentos. Bloquear não cancela automaticamente.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingScaleConfirm(null)}
                        className="px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const type = pendingScaleConfirm.type;
                          setPendingScaleConfirm(null);
                          runCreateScale(type, scaleMonth, true);
                        }}
                        className="px-3 py-1.5 rounded-full bg-studio-text text-white text-[10px] font-extrabold uppercase tracking-wide"
                      >
                        Criar mesmo assim
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleClearScale(scaleMonth)}
                  disabled={loading}
                  className="w-full text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-wide py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Limpar escala do mês
                </button>
              </div>

              {!scaleHasShiftBlocks && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-stone-50 bg-opacity-95 backdrop-blur-sm">
                  <button
                    onClick={() => runCreateScale(scaleType, scaleMonth)}
                    disabled={loading}
                    className="w-full bg-studio-green hover:bg-studio-dark text-white h-14 rounded-2xl font-bold text-sm uppercase tracking-wide shadow-xl shadow-green-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    Aplicar escala
                  </button>
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
});

