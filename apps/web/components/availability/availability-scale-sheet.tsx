"use client";

import type { PointerEventHandler, RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar, Sparkles, Trash2 } from "lucide-react";

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
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in">
      <div
        ref={sheetRef}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
        className="w-full max-w-md bg-white rounded-t-4xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4"
      >
        <div
          className="pt-3 pb-1 flex justify-center bg-white cursor-grab active:cursor-grabbing"
          onPointerDown={onDragStartAction}
          onPointerMove={onDragMoveAction}
          onPointerUp={onDragEndAction}
          onPointerCancel={onDragEndAction}
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
            onClick={onCloseAction}
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
                onChange={(event) => onChangeScaleMonthAction(event.target.value)}
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
                onClick={() => onClearScaleAction(scaleMonth, true)}
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
                    onClick={() => onSelectScaleTypeAction("odd")}
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
                    onClick={() => onSelectScaleTypeAction("even")}
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
              <p>{pendingScaleConfirm.appointments} dia(s) têm agendamentos. Bloquear não cancela automaticamente.</p>
              <div className="flex gap-2">
                <button
                  onClick={onDismissPendingScaleConfirmAction}
                  className="px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirmPendingScaleAction(pendingScaleConfirm.type, scaleMonth)}
                  className="px-3 py-1.5 rounded-full bg-studio-text text-white text-[10px] font-extrabold uppercase tracking-wide"
                >
                  Criar mesmo assim
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => onClearScaleAction(scaleMonth)}
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
              onClick={() => onApplyScaleAction(scaleType, scaleMonth)}
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
  );
}
