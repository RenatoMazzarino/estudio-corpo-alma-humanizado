"use client";

import { format, parseISO } from "date-fns";
import { HeartPulse, Home, Trash2 } from "lucide-react";
import { forwardRef, useImperativeHandle } from "react";
import { MonthCalendar, type MonthCalendarDot } from "./agenda/month-calendar";
import { CalendarLegendV2 } from "./ui/calendar-legend-v2";
import { SectionCard, SectionCardBody, SectionCardEmptyState, SectionCardHeader } from "./ui/section-card";
import { Toast, useToast } from "./ui/toast";
import { blockTypeMeta, formatBlockTime } from "./availability/availability-manager.constants";
import { AvailabilityBlockSheet } from "./availability/availability-block-sheet";
import { AvailabilityScaleSheet } from "./availability/availability-scale-sheet";
import type { BlockType } from "./availability/availability-manager.types";
import { useAvailabilityManagerController } from "./availability/use-availability-manager-controller";

export interface AvailabilityManagerHandle {
  openBlockModal: (date?: Date) => void;
}

function getClientName(input: { clients?: { name?: string | null } | null }) {
  const value = input.clients?.name?.trim();
  return value && value.length > 0 ? value : "Cliente";
}

export const AvailabilityManager = forwardRef<AvailabilityManagerHandle>(function AvailabilityManager(_, ref) {
  const { toast, showToast } = useToast();
  const controller = useAvailabilityManagerController(showToast);

  useImperativeHandle(
    ref,
    () => ({
      openBlockModal: controller.openBlockModal,
    }),
    [controller.openBlockModal]
  );

  const calendarLegend = (
    <CalendarLegendV2
      items={[
        { key: "appointments", label: "Atendimento", dotClassName: "bg-studio-green" },
        { key: "home", label: "Domicilio", dotClassName: "bg-dom" },
        { key: "shift", label: "Plantao", dotClassName: "bg-red-500" },
        { key: "partial", label: "Parcial", dotClassName: "bg-amber-500" },
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <Toast toast={toast} />

      <div className="wl-surface-card shadow-soft">
        <MonthCalendar
          framed={false}
          currentMonth={controller.currentMonthDate}
          selectedDate={controller.selectedDate}
          onChangeMonthAction={controller.handleMonthChange}
          onSelectDayAction={controller.setSelectedDate}
          headerActions={
            <button
              type="button"
              onClick={controller.openScaleModal}
              className="wl-header-icon-button-soft inline-flex h-9 w-9 items-center justify-center rounded-full transition"
              aria-label="Abrir gerador de escala"
            >
              <HeartPulse className="h-4 w-4" />
            </button>
          }
          getDayDotsAction={(day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppointments = controller.appointmentsByDate.get(key) ?? [];
            const dayBlocks = controller.blocksByDate.get(key) ?? [];
            const hasHomeVisit = dayAppointments.some((item) => item.is_home_visit);
            const hasShiftBlock = dayBlocks.some(
              (item) => (item.block_type ?? "personal") === "shift" && Boolean(item.is_full_day)
            );
            const hasPartialBlock = dayBlocks.some(
              (item) => !((item.block_type ?? "personal") === "shift" && Boolean(item.is_full_day))
            );

            const dots: MonthCalendarDot[] = [];
            if (dayAppointments.length > 0) {
              dots.push({ key: "appointments", className: "bg-studio-green", title: "Atendimento" });
            }
            if (hasHomeVisit) dots.push({ key: "home", className: "bg-dom", title: "Domicilio" });
            if (hasShiftBlock) dots.push({ key: "shift", className: "bg-red-500", title: "Plantao" });
            if (hasPartialBlock) dots.push({ key: "partial", className: "bg-amber-500", title: "Parcial" });
            return dots;
          }}
          legend={calendarLegend}
          legendPlacement="bottom"
        />

        {controller.isOverviewLoading ? (
          <div className="border-t border-line px-4 py-3 wl-surface-card-body">
            <p className="wl-typo-body-sm text-muted">Carregando agenda do mes...</p>
          </div>
        ) : (
          <>
            {controller.selectedBlocks.length === 0 && controller.selectedAppointments.length === 0 ? (
              <section className="border-t border-line px-4 py-4">
                <SectionCard>
                  <SectionCardHeader title="Dia selecionado" />
                  <SectionCardBody className="p-3">
                    <SectionCardEmptyState message="Sem bloqueios e agendamentos para este dia." className="wl-surface-card-body" />
                  </SectionCardBody>
                </SectionCard>
              </section>
            ) : null}

            {controller.selectedBlocks.length > 0 ? (
              <section className="border-t border-line px-4 py-4">
                <SectionCard>
                  <SectionCardHeader title="Bloqueios do dia" />
                  <SectionCardBody className="space-y-2 p-3">
                    {controller.selectedBlocks.map((block) => {
                      const meta =
                        blockTypeMeta[(block.block_type ?? "personal") as BlockType] ?? blockTypeMeta.personal;
                      return (
                        <article key={block.id} className="wl-radius-card border border-line wl-surface-card-body p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center wl-radius-control ${meta.iconClass}`}
                              >
                                {meta.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="wl-typo-title truncate text-studio-text">{block.title}</p>
                                <p className="wl-typo-body-sm pt-0.5 text-muted">{formatBlockTime(block)}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => controller.handleDeleteBlock(block.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition hover:text-red-600"
                              aria-label="Remover bloqueio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </SectionCardBody>
                </SectionCard>
              </section>
            ) : null}

            {controller.selectedAppointments.length > 0 ? (
              <section className="border-t border-line px-4 py-4">
                <SectionCard>
                  <SectionCardHeader title="Agendamentos do dia" />
                  <SectionCardBody className="space-y-2 p-3">
                    {controller.selectedAppointments.map((item) => {
                      const startLabel = format(parseISO(item.start_time), "HH:mm");
                      return (
                        <article key={item.id} className="wl-radius-card border border-line wl-surface-card-body px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="wl-typo-title truncate text-studio-text">{getClientName(item)}</p>
                              <p className="wl-typo-body-sm truncate pt-0.5 text-muted">{item.service_name}</p>
                            </div>
                            <div className="flex items-center gap-1 text-studio-text">
                              {item.is_home_visit ? <Home className="h-3.5 w-3.5 text-dom-strong" /> : null}
                              <span className="wl-typo-body-sm-strong">{startLabel}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </SectionCardBody>
                </SectionCard>
              </section>
            ) : null}
          </>
        )}
      </div>

      <AvailabilityBlockSheet
        open={controller.isModalOpen}
        portalTarget={controller.portalTarget}
        sheetRef={controller.blockSheetRef}
        dragOffset={controller.blockDragOffset}
        isDragging={controller.isBlockDragging}
        blockDateLabel={controller.blockDateLabel}
        blockDate={controller.blockDate}
        blockFullDay={controller.blockFullDay}
        blockStart={controller.blockStart}
        blockEnd={controller.blockEnd}
        blockTitle={controller.blockTitle}
        loading={controller.loading}
        pendingBlockConfirm={controller.pendingBlockConfirm}
        onCloseAction={() => controller.setIsModalOpen(false)}
        onDragStartAction={controller.handleBlockDragStart}
        onDragMoveAction={controller.handleBlockDragMove}
        onDragEndAction={controller.handleBlockDragEnd}
        onChangeBlockDateAction={controller.setBlockDate}
        onToggleBlockFullDayAction={() => controller.setBlockFullDay((prev) => !prev)}
        onChangeBlockStartAction={controller.setBlockStart}
        onChangeBlockEndAction={controller.setBlockEnd}
        onChangeBlockTitleAction={controller.setBlockTitle}
        onDismissPendingBlockConfirmAction={() => controller.setPendingBlockConfirm(null)}
        onConfirmPendingBlockAction={(payload) => {
          controller.setPendingBlockConfirm(null);
          controller.handleCreateBlock(true, { ...payload, force: true });
        }}
        onSubmitAction={() => controller.handleCreateBlock()}
      />

      <AvailabilityScaleSheet
        open={controller.isScaleModalOpen}
        portalTarget={controller.portalTarget}
        sheetRef={controller.scaleSheetRef}
        dragOffset={controller.scaleDragOffset}
        isDragging={controller.isScaleDragging}
        scaleMonth={controller.scaleMonth}
        scaleType={controller.scaleType}
        isScaleOverviewLoading={controller.isScaleOverviewLoading}
        scaleHasShiftBlocks={controller.scaleHasShiftBlocks}
        loading={controller.loading}
        pendingScaleConfirm={controller.pendingScaleConfirm}
        onCloseAction={() => controller.setIsScaleModalOpen(false)}
        onDragStartAction={controller.handleScaleDragStart}
        onDragMoveAction={controller.handleScaleDragMove}
        onDragEndAction={controller.handleScaleDragEnd}
        onChangeScaleMonthAction={controller.setScaleMonth}
        onSelectScaleTypeAction={controller.setScaleType}
        onClearScaleAction={controller.handleClearScale}
        onDismissPendingScaleConfirmAction={() => controller.setPendingScaleConfirm(null)}
        onConfirmPendingScaleAction={(type, month) => {
          controller.setPendingScaleConfirm(null);
          controller.runCreateScale(type, month, true);
        }}
        onApplyScaleAction={(type, month) => controller.runCreateScale(type, month)}
      />
    </div>
  );
});
