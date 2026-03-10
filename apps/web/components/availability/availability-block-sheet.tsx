"use client";

import type { RefObject, PointerEventHandler } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Calendar, Shield } from "lucide-react";
import { blockTypeOptions } from "./availability-manager.constants";
import type { BlockType, CreateBlockPayload } from "./availability-manager.types";

type AvailabilityBlockSheetProps = {
  open: boolean;
  portalTarget: HTMLElement | null;
  sheetRef: RefObject<HTMLDivElement | null>;
  dragOffset: number;
  isDragging: boolean;
  blockDateLabel: string;
  blockType: BlockType;
  blockDate: string;
  blockFullDay: boolean;
  blockStart: string;
  blockEnd: string;
  blockTitle: string;
  loading: boolean;
  pendingBlockConfirm: { payload: CreateBlockPayload; appointments: number } | null;
  onCloseAction: () => void;
  onDragStartAction: PointerEventHandler<HTMLDivElement>;
  onDragMoveAction: PointerEventHandler<HTMLDivElement>;
  onDragEndAction: PointerEventHandler<HTMLDivElement>;
  onSelectBlockTypeAction: (value: BlockType) => void;
  onChangeBlockDateAction: (value: string) => void;
  onToggleBlockFullDayAction: () => void;
  onChangeBlockStartAction: (value: string) => void;
  onChangeBlockEndAction: (value: string) => void;
  onChangeBlockTitleAction: (value: string) => void;
  onDismissPendingBlockConfirmAction: () => void;
  onConfirmPendingBlockAction: (payload: CreateBlockPayload) => void;
  onSubmitAction: () => void;
};

export function AvailabilityBlockSheet({
  open,
  portalTarget,
  sheetRef,
  dragOffset,
  isDragging,
  blockDateLabel,
  blockType,
  blockDate,
  blockFullDay,
  blockStart,
  blockEnd,
  blockTitle,
  loading,
  pendingBlockConfirm,
  onCloseAction,
  onDragStartAction,
  onDragMoveAction,
  onDragEndAction,
  onSelectBlockTypeAction,
  onChangeBlockDateAction,
  onToggleBlockFullDayAction,
  onChangeBlockStartAction,
  onChangeBlockEndAction,
  onChangeBlockTitleAction,
  onDismissPendingBlockConfirmAction,
  onConfirmPendingBlockAction,
  onSubmitAction,
}: AvailabilityBlockSheetProps) {
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
            <h2 className="text-xl font-black text-studio-dark tracking-tight">Novo Bloqueio</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-0.5">{blockDateLabel}</p>
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
              <Shield className="w-3.5 h-3.5" />
              Motivo
            </div>
            <div className="grid grid-cols-4 gap-3">
              {blockTypeOptions.map((option) => {
                const isActive = blockType === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => onSelectBlockTypeAction(option.type)}
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
                onChange={(event) => onChangeBlockDateAction(event.target.value)}
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
                  onClick={onToggleBlockFullDayAction}
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
                      onChange={(event) => onChangeBlockStartAction(event.target.value)}
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
                      onChange={(event) => onChangeBlockEndAction(event.target.value)}
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
                onChange={(event) => onChangeBlockTitleAction(event.target.value)}
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
                  onClick={onDismissPendingBlockConfirmAction}
                  className="px-3 py-1.5 rounded-full border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-wide"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirmPendingBlockAction(pendingBlockConfirm.payload)}
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
            onClick={onSubmitAction}
            disabled={loading}
            className="w-full bg-studio-green hover:bg-studio-dark text-white h-14 rounded-2xl font-bold text-sm uppercase tracking-wide shadow-xl shadow-green-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            Confirmar bloqueio
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
