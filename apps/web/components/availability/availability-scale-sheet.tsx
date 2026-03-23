"use client";

import type { PointerEventHandler, RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar, CircleAlert, Sparkles, Trash2 } from "lucide-react";
import { BottomSheetHeaderV2 } from "../ui/bottom-sheet-header-v2";
import { FooterRail } from "../ui/footer-rail";

type AvailabilityScaleSheetProps = {
  open: boolean;
  portalTarget: HTMLElement | null;
  sheetRef: RefObject<HTMLDivElement | null>;
  dragOffset: number;
  isDragging: boolean;
  scaleMonth: string;
  scaleType: "even" | "odd";
  isScaleOverviewLoading: boolean;
  scaleHasShiftBlocks: boolean;
  loading: boolean;
  pendingScaleConfirm: { type: "even" | "odd"; appointments: number } | null;
  onCloseAction: () => void;
  onDragStartAction: PointerEventHandler<HTMLDivElement>;
  onDragMoveAction: PointerEventHandler<HTMLDivElement>;
  onDragEndAction: PointerEventHandler<HTMLDivElement>;
  onChangeScaleMonthAction: (value: string) => void;
  onSelectScaleTypeAction: (value: "even" | "odd") => void;
  onClearScaleAction: (month: string, keepOpen?: boolean) => void;
  onDismissPendingScaleConfirmAction: () => void;
  onConfirmPendingScaleAction: (type: "even" | "odd", month: string) => void;
  onApplyScaleAction: (type: "even" | "odd", month: string) => void;
};

export function AvailabilityScaleSheet({
  open,
  portalTarget,
  sheetRef,
  dragOffset,
  isDragging,
  scaleMonth,
  scaleType,
  isScaleOverviewLoading,
  scaleHasShiftBlocks,
  loading,
  pendingScaleConfirm,
  onCloseAction,
  onDragStartAction,
  onDragMoveAction,
  onDragEndAction,
  onChangeScaleMonthAction,
  onSelectScaleTypeAction,
  onClearScaleAction,
  onDismissPendingScaleConfirmAction,
  onConfirmPendingScaleAction,
  onApplyScaleAction,
}: AvailabilityScaleSheetProps) {
  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar gerador de escala"
        onClick={onCloseAction}
        className="pointer-events-auto absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]"
      />
      <div
        ref={sheetRef}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
        className="pointer-events-auto relative flex max-h-[95vh] w-full max-w-105 flex-col overflow-hidden wl-radius-sheet wl-surface-modal shadow-float"
      >
        <BottomSheetHeaderV2
          title="Gerador de escala"
          subtitle="Crie bloqueios automaticos por dias pares ou impares."
          onCloseAction={onCloseAction}
          onDragStartAction={onDragStartAction}
          onDragMoveAction={onDragMoveAction}
          onDragEndAction={onDragEndAction}
        />

        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-5 pb-24 pt-5 wl-surface-modal-body">
          <section>
            <div className="wl-surface-card">
              <div className="flex items-center gap-2 border-b border-line wl-surface-card-header px-3 py-2.5">
                <Calendar className="h-3.5 w-3.5 text-studio-text" />
                <p className="wl-typo-label text-studio-text">Mes da escala</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <input
                  id="scale-month-input"
                  type="month"
                  value={scaleMonth}
                  onChange={(event) => onChangeScaleMonthAction(event.target.value)}
                  className="h-10 w-full rounded-lg border border-line wl-surface-input px-3 wl-typo-body text-studio-text outline-none focus:ring-1 focus:ring-studio-green/35"
                />
              </div>
            </div>
          </section>

          {isScaleOverviewLoading ? (
            <div className="wl-surface-card">
              <div className="flex items-center gap-2 border-b border-line wl-surface-card-header px-3 py-2.5">
                <p className="wl-typo-label text-studio-text">Status</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <p className="wl-typo-body-sm text-muted">Carregando escala do mes...</p>
              </div>
            </div>
          ) : scaleHasShiftBlocks ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/85 p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <CircleAlert className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wl-typo-label text-amber-800">Conflito de escala</p>
                  <p className="wl-typo-body-sm pt-1 text-amber-900/90">
                    Ja existe escala de plantao neste mes. Para editar a escala deste mes, primeiro
                    apague a escala atual usando o botao &quot;Limpar escala do mes&quot; abaixo.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <section>
              <div className="wl-surface-card">
                <div className="flex items-center gap-2 border-b border-line wl-surface-card-header px-3 py-2.5">
                  <p className="wl-typo-label text-studio-text">Padrao de escala</p>
                </div>
                <div className="grid gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => onSelectScaleTypeAction("even")}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      scaleType === "even"
                        ? "border-studio-green/30 bg-studio-light text-studio-text"
                        : "border-line wl-surface-card-body text-muted hover:bg-paper"
                    }`}
                  >
                    <span className="wl-typo-body-strong block">Bloquear dias pares</span>
                    <span className="wl-typo-body-sm mt-1 block">02, 04, 06, ...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectScaleTypeAction("odd")}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      scaleType === "odd"
                        ? "border-studio-green/30 bg-studio-light text-studio-text"
                        : "border-line wl-surface-card-body text-muted hover:bg-paper"
                    }`}
                  >
                    <span className="wl-typo-body-strong block">Bloquear dias impares</span>
                    <span className="wl-typo-body-sm mt-1 block">01, 03, 05, ...</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {pendingScaleConfirm ? (
            <div className="wl-surface-card border border-studio-accent/30">
              <div className="flex items-center gap-2 border-b border-studio-accent/20 wl-surface-card-header px-3 py-2.5">
                <p className="wl-typo-label text-studio-text">Conflito com agenda</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <p className="wl-typo-body-sm text-muted">
                  {pendingScaleConfirm.appointments} dia(s) com atendimento. Deseja aplicar mesmo assim?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={onDismissPendingScaleConfirmAction}
                    className="wl-typo-button h-9 rounded-lg border border-studio-accent/30 px-3 text-studio-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmPendingScaleAction(pendingScaleConfirm.type, scaleMonth)}
                    className="wl-typo-button h-9 rounded-lg bg-studio-green px-3 text-white"
                  >
                    Criar mesmo assim
                  </button>
                </div>
              </div>
            </div>
          ) : null}

        </div>

        <FooterRail
          className="absolute inset-x-0 bottom-0"
          surfaceClassName="bg-[rgba(250,247,242,0.96)]"
          paddingXClassName="px-5"
        >
          {scaleHasShiftBlocks ? (
            <button
              type="button"
              onClick={() => onClearScaleAction(scaleMonth)}
              disabled={loading}
              className="wl-typo-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-700 bg-red-600 text-white shadow-lg shadow-red-500/30 transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Limpar escala do mes
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onApplyScaleAction(scaleType, scaleMonth)}
              disabled={loading}
              className="wl-typo-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-studio-green text-white shadow-lg shadow-studio-green/30 transition active:scale-[0.99] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Aplicar escala
            </button>
          )}
        </FooterRail>
      </div>
    </div>,
    portalTarget
  );
}



