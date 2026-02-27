"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";

type PaymentMethod = "pix" | "card" | "cash" | "other";

interface UseAppointmentDetailsSheetControllerParams {
  open: boolean;
  details: AttendanceOverview | null;
  onClose: () => void;
  onSaveEvolution?: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolution?: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
}

export function useAppointmentDetailsSheetController({
  open,
  details,
  onClose,
  onSaveEvolution,
  onStructureEvolution,
}: UseAppointmentDetailsSheetControllerParams) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [notifyClientOnCancel, setNotifyClientOnCancel] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [evolutionDraft, setEvolutionDraft] = useState("");
  const [evolutionSaving, setEvolutionSaving] = useState(false);
  const [evolutionStructuring, setEvolutionStructuring] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!open) {
      setCancelDialogOpen(false);
      setNotifyClientOnCancel(false);
      setDragOffset(0);
      setEvolutionModalOpen(false);
      setEvolutionSaving(false);
      setEvolutionStructuring(false);
      dragOffsetRef.current = 0;
      return;
    }
    setCancelDialogOpen(false);
    setNotifyClientOnCancel(false);
    setDragOffset(0);
    setPaymentMethod("pix");
    setEvolutionModalOpen(false);
    setEvolutionSaving(false);
    setEvolutionStructuring(false);
    setEvolutionDraft(details?.evolution?.[0]?.evolution_text?.trim() ?? "");
    dragOffsetRef.current = 0;
  }, [open, details?.appointment?.id, details?.evolution]);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const delta = Math.max(0, event.clientY - dragStartRef.current);
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height ?? 0;
    const threshold = Math.max(80, sheetHeight * 0.25);
    const finalOffset = dragOffsetRef.current;
    dragStartRef.current = null;
    setIsDragging(false);
    if (finalOffset > threshold) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      onClose();
      return;
    }
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  const handleStructureEvolution = async () => {
    if (!onStructureEvolution || !evolutionDraft.trim()) return;
    setEvolutionStructuring(true);
    const result = await onStructureEvolution(evolutionDraft);
    if (result.ok && result.structuredText) {
      setEvolutionDraft(result.structuredText);
    }
    setEvolutionStructuring(false);
  };

  const handleSaveEvolution = async () => {
    if (!onSaveEvolution) return;
    setEvolutionSaving(true);
    const result = await onSaveEvolution(evolutionDraft);
    setEvolutionSaving(false);
    if (result.ok) {
      setEvolutionModalOpen(false);
    }
  };

  return {
    portalTarget,
    cancelDialogOpen,
    notifyClientOnCancel,
    dragOffset,
    isDragging,
    paymentMethod,
    evolutionModalOpen,
    evolutionDraft,
    evolutionSaving,
    evolutionStructuring,
    sheetRef,
    setCancelDialogOpen,
    setNotifyClientOnCancel,
    setPaymentMethod,
    setEvolutionModalOpen,
    setEvolutionDraft,
    handleDragStart,
    handleDragMove,
    finishDrag,
    handleStructureEvolution,
    handleSaveEvolution,
  };
}
