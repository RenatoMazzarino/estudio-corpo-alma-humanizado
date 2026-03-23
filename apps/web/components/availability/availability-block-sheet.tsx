"use client";

import type { PointerEventHandler, RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar, CircleAlert } from "lucide-react";
import { BottomSheetHeaderV2 } from "../ui/bottom-sheet-header-v2";
import { FooterRail } from "../ui/footer-rail";
import type { CreateBlockPayload } from "./availability-manager.types";

type AvailabilityBlockSheetProps = {
  open: boolean;
  portalTarget: HTMLElement | null;
  sheetRef: RefObject<HTMLDivElement | null>;
  dragOffset: number;
  isDragging: boolean;
  blockDateLabel: string;
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
    <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar novo bloqueio"
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
          title="Novo bloqueio"
          subtitle={blockDateLabel}
          onCloseAction={onCloseAction}
          onDragStartAction={onDragStartAction}
          onDragMoveAction={onDragMoveAction}
          onDragEndAction={onDragEndAction}
        />

        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-5 pb-24 pt-5 wl-surface-modal-body">
          <section>
            <div className="wl-surface-card">
              <div className="flex items-center gap-2 border-b border-line wl-surface-card-header px-3 py-2.5">
                <p className="wl-typo-label text-studio-text">Detalhes</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <label className="wl-typo-body-sm text-muted" htmlFor="block-title-input">
                  Titulo do bloqueio
                </label>
                <input
                  id="block-title-input"
                  type="text"
                  value={blockTitle}
                  onChange={(event) => onChangeBlockTitleAction(event.target.value)}
                  placeholder="Ex: Bloqueio interno"
                  className="mt-1.5 h-10 w-full rounded-lg border border-line wl-surface-input px-3 wl-typo-body text-studio-text outline-none focus:ring-1 focus:ring-studio-green/35"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="wl-surface-card">
              <div className="flex items-center gap-2 border-b border-line wl-surface-card-header px-3 py-2.5">
                <p className="wl-typo-label text-studio-text">Data e horario</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <label className="wl-typo-body-sm text-muted" htmlFor="block-date-input">
                  Dia do bloqueio
                </label>
                <input
                  id="block-date-input"
                  type="date"
                  value={blockDate}
                  onChange={(event) => onChangeBlockDateAction(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line wl-surface-input px-3 wl-typo-body text-studio-text outline-none focus:ring-1 focus:ring-studio-green/35"
                />

                <div className="mt-3 flex items-center justify-between rounded-lg border border-line wl-surface-card-header px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-paper text-studio-text">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="wl-typo-body-strong text-studio-text">Dia inteiro</p>
                      <p className="wl-typo-body-sm text-muted">Bloqueia a data completa</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleBlockFullDayAction}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      blockFullDay ? "bg-studio-green" : "bg-line"
                    }`}
                    aria-pressed={blockFullDay}
                  >
                    <span
                      className={`block h-4.5 w-4.5 rounded-full bg-white transition-transform ${
                        blockFullDay ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {!blockFullDay ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="wl-typo-body-sm text-muted" htmlFor="block-start-input">
                        Inicio
                      </label>
                      <input
                        id="block-start-input"
                        type="time"
                        value={blockStart}
                        onChange={(event) => onChangeBlockStartAction(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-line wl-surface-input px-3 wl-typo-body text-studio-text outline-none focus:ring-1 focus:ring-studio-green/35"
                      />
                    </div>
                    <div>
                      <label className="wl-typo-body-sm text-muted" htmlFor="block-end-input">
                        Fim
                      </label>
                      <input
                        id="block-end-input"
                        type="time"
                        value={blockEnd}
                        onChange={(event) => onChangeBlockEndAction(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-line wl-surface-input px-3 wl-typo-body text-studio-text outline-none focus:ring-1 focus:ring-studio-green/35"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {pendingBlockConfirm ? (
            <div className="wl-surface-card border border-studio-accent/30">
              <div className="flex items-center gap-2 border-b border-studio-accent/20 wl-surface-card-header px-3 py-2.5">
                <p className="wl-typo-label text-studio-text">Conflito com atendimentos</p>
              </div>
              <div className="p-3 wl-surface-card-body">
                <p className="wl-typo-body-sm mt-1 text-muted">
                  {pendingBlockConfirm.appointments} atendimento(s) serao mantidos. Confirma criar mesmo assim?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={onDismissPendingBlockConfirmAction}
                    className="wl-typo-button h-9 rounded-lg border border-studio-accent/30 px-3 text-studio-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmPendingBlockAction(pendingBlockConfirm.payload)}
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
          <button
            type="button"
            onClick={onSubmitAction}
            disabled={loading}
            className="wl-typo-button h-11 w-full rounded-xl bg-studio-green text-white shadow-lg shadow-studio-green/30 transition active:scale-[0.99] disabled:opacity-60"
          >
            Confirmar bloqueio
          </button>
        </FooterRail>

        {loading ? (
          <div className="pointer-events-none absolute left-0 right-0 top-23.5 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-line wl-surface-card-body px-2 py-1">
              <CircleAlert className="h-3.5 w-3.5 text-muted" />
              <span className="wl-typo-body-sm text-muted">Salvando...</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget
  );
}



