"use client";

import { forwardRef, useImperativeHandle } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield, Sparkles, Trash2 } from "lucide-react";
import { MonthCalendar } from "./agenda/month-calendar";
import { Toast, useToast } from "./ui/toast";
import { blockTypeMeta, formatBlockTime } from "./availability/availability-manager.constants";
import { AvailabilityBlockSheet } from "./availability/availability-block-sheet";
import { AvailabilityScaleSheet } from "./availability/availability-scale-sheet";
import type { BlockType } from "./availability/availability-manager.types";
import { useAvailabilityManagerController } from "./availability/use-availability-manager-controller";

export interface AvailabilityManagerHandle {
  openBlockModal: (date?: Date) => void;
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

  return (
    <div className="space-y-5">
      <Toast toast={toast} />

      <MonthCalendar
        currentMonth={controller.currentMonthDate}
        selectedDate={controller.selectedDate}
        onChangeMonthAction={controller.handleMonthChange}
        onSelectDayAction={controller.setSelectedDate}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={controller.openScaleModal}
              className="h-9 w-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition shadow-sm"
              aria-label="Gerador de escala"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        }
        getDayToneAction={(day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocks = controller.blocksByDate.get(key) ?? [];
          return dayBlocks.some((block) => (block.block_type ?? "personal") === "shift") ? "shift" : "none";
        }}
        getDayDotsAction={(day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBlocks = controller.blocksByDate.get(key) ?? [];
          const dayAppointments = controller.appointmentsByDate.get(key) ?? [];
          const hasHome = dayAppointments.some((appt) => appt.is_home_visit);
          const hasAppointments = dayAppointments.length > 0;
          const dayTypes = new Set(dayBlocks.map((block) => (block.block_type ?? "personal") as BlockType));
          const dots = [];
          if (hasAppointments) dots.push({ key: "appointments", className: "bg-studio-green" });
          if (hasHome) dots.push({ key: "home", className: "bg-dom" });
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
                <span className="w-1.5 h-1.5 rounded-full bg-dom" />
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
                {format(controller.selectedDate, "EEEE, dd 'de' MMM", { locale: ptBR })}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Bloqueios cadastrados para o dia selecionado.</p>
            </div>

            {controller.selectedBlocks.length === 0 ? (
              <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-4 text-xs text-gray-500">
                Nenhum bloqueio cadastrado para este dia.
              </div>
            ) : (
              <div className="space-y-3">
                {controller.selectedBlocks.map((block) => {
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
                        onClick={() => controller.handleDeleteBlock(block.id)}
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

      <AvailabilityBlockSheet
        open={controller.isModalOpen}
        portalTarget={controller.portalTarget}
        sheetRef={controller.blockSheetRef}
        dragOffset={controller.blockDragOffset}
        isDragging={controller.isBlockDragging}
        blockDateLabel={controller.blockDateLabel}
        blockType={controller.blockType}
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
        onSelectBlockTypeAction={controller.setBlockType}
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
