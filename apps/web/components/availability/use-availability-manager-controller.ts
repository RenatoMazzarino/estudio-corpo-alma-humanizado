
import { format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createShiftBlocks, clearMonthBlocks } from "../../app/(dashboard)/admin/escala/actions";
import { createAvailabilityBlock, deleteAvailabilityBlock, getMonthOverview } from "../../app/(dashboard)/bloqueios/actions";
import { feedbackById, feedbackFromError } from "../../src/shared/feedback/user-feedback";
import type { AvailabilityBlock, BlockType, CreateBlockPayload, MonthOverview } from "./availability-manager.types";

export function useAvailabilityManagerController(showToast: (feedback: ReturnType<typeof feedbackById> | ReturnType<typeof feedbackFromError>) => void) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overview, setOverview] = useState<MonthOverview>({ blocks: [], appointments: [] });
  const [loading, setLoading] = useState(false);
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
    try {
      const result = await createShiftBlocks(type, monthStr, force);
      if (!result.ok) throw result.error;
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingScaleConfirm({ type, appointments: result.data.conflicts.appointments });
        return;
      }
      showToast(
        feedbackById("generic_saved", {
          tone: "success",
          message: `Escala aplicada para dias ${type === "even" ? "pares" : "ímpares"} em ${format(
            parseISO(`${monthStr}-01`),
            "MMMM/yyyy",
            { locale: ptBR }
          )}.`,
        })
      );
      setSelectedMonth(monthStr);
      const data = await getMonthOverview(monthStr);
      setOverview(data);
      setIsScaleModalOpen(false);
    } catch (error) {
      showToast(feedbackFromError(error, "agenda"));
    } finally {
      setLoading(false);
    }
  };

  const handleClearScale = async (monthStr: string, keepOpen = false) => {
    if (!confirm("Tem certeza? Isso apagará a escala (plantões) deste mês.")) return;
    setLoading(true);
    try {
      const result = await clearMonthBlocks(monthStr);
      if (!result.ok) throw result.error;
      showToast(feedbackById("generic_saved", { tone: "success", message: "Escala removida com sucesso." }));
      const data = await getMonthOverview(monthStr);
      if (monthStr === selectedMonth) {
        setOverview(data);
      }
      setScaleMonthOverview(data);
      if (!keepOpen) {
        setIsScaleModalOpen(false);
      }
    } catch (error) {
      showToast(feedbackFromError(error, "agenda"));
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

  const openBlockModal = (date?: Date) => {
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
  };

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
    try {
      const result = await createAvailabilityBlock(payload);
      if (!result.ok) throw result.error;
      if (result.data.requiresConfirm && result.data.conflicts) {
        setPendingBlockConfirm({ payload, appointments: result.data.conflicts.appointments });
        return;
      }
      showToast(feedbackById("generic_saved", { tone: "success", message: "Bloqueio registrado." }));
      setIsModalOpen(false);
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      showToast(feedbackFromError(error, "agenda"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    setLoading(true);
    try {
      const result = await deleteAvailabilityBlock(id);
      if (!result.ok) throw result.error;
      showToast(feedbackById("generic_saved", { tone: "success", message: "Bloqueio removido." }));
      const data = await getMonthOverview(selectedMonth);
      setOverview(data);
    } catch (error) {
      showToast(feedbackFromError(error, "agenda"));
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedDate,
    currentMonthDate,
    blocksByDate,
    appointmentsByDate,
    selectedBlocks,
    blockDateLabel,
    scaleHasShiftBlocks,
    portalTarget,
    blockSheetRef,
    blockDragOffset,
    isBlockDragging,
    blockType,
    blockDate,
    blockFullDay,
    blockStart,
    blockEnd,
    blockTitle,
    loading,
    pendingBlockConfirm,
    isModalOpen,
    scaleSheetRef,
    scaleDragOffset,
    isScaleDragging,
    scaleMonth,
    scaleType,
    isScaleOverviewLoading,
    pendingScaleConfirm,
    isScaleModalOpen,
    handleMonthChange,
    setSelectedDate,
    openScaleModal,
    setIsModalOpen,
    handleBlockDragStart,
    handleBlockDragMove,
    handleBlockDragEnd,
    setBlockType,
    setBlockDate,
    setBlockFullDay,
    setBlockStart,
    setBlockEnd,
    setBlockTitle,
    setPendingBlockConfirm,
    handleCreateBlock,
    setIsScaleModalOpen,
    handleScaleDragStart,
    handleScaleDragMove,
    handleScaleDragEnd,
    setScaleMonth,
    setScaleType,
    handleClearScale,
    setPendingScaleConfirm,
    runCreateScale,
    handleDeleteBlock,
    openBlockModal,
  };
}
