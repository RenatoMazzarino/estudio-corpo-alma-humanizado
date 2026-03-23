"use client";

import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { ModulePage } from "./ui/module-page";
import { MobileAgendaDaySection } from "./agenda/mobile-agenda-day-section";
import { MobileAgendaWeekSection } from "./agenda/mobile-agenda-week-section";
import { MobileAgendaHeader } from "./agenda/mobile-agenda-header";
import { MobileAgendaOverlays } from "./agenda/mobile-agenda-overlays";
import { AvailabilityManager } from "./availability-manager";
import type { MobileAgendaProps } from "./agenda/mobile-agenda.types";
import { useMobileAgendaScreenController } from "./agenda/use-mobile-agenda-screen-controller";
import type { AgendaDayLayoutMode } from "./agenda/mobile-agenda.types";
import { BlockingOverlay } from "./ui/loading-system";

export function MobileAgenda(props: MobileAgendaProps) {
  const controller = useMobileAgendaScreenController(props);
  const [dayLayoutMode, setDayLayoutMode] = useState<AgendaDayLayoutMode>("v1");
  const [isLoadingPreviewVisible, setIsLoadingPreviewVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteAppointmentId, setPendingDeleteAppointmentId] = useState<string | null>(null);
  const [notifyClientOnDelete, setNotifyClientOnDelete] = useState(false);
  const loadingPreviewTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingPreviewTimeoutRef.current) {
        window.clearTimeout(loadingPreviewTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const targetId = controller.highlightAppointmentId;
    if (!targetId || controller.view !== "day") return;

    let cancelled = false;
    let attempt = 0;

    const scrollToTargetCard = () => {
      if (cancelled) return;
      const selector = `[data-appointment-id="${targetId}"]`;
      const target = document.querySelector(selector) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({
          behavior: attempt === 0 ? "auto" : "smooth",
          block: "center",
          inline: "nearest",
        });
        return;
      }
      attempt += 1;
      if (attempt <= 20) {
        window.setTimeout(scrollToTargetCard, 120);
      }
    };

    scrollToTargetCard();

    return () => {
      cancelled = true;
    };
  }, [controller.highlightAppointmentId, controller.view]);

  const triggerLoadingPreview = () => {
    if (loadingPreviewTimeoutRef.current) {
      window.clearTimeout(loadingPreviewTimeoutRef.current);
    }
    setIsLoadingPreviewVisible(true);
    loadingPreviewTimeoutRef.current = window.setTimeout(() => {
      setIsLoadingPreviewVisible(false);
      loadingPreviewTimeoutRef.current = null;
    }, 2800);
  };

  const openRecordFromCard = (payload: { id: string; returnTo: string }) => {
    controller.setActionSheet(null);
    controller.router.push(`/atendimento/${payload.id}?return=${encodeURIComponent(payload.returnTo)}`);
  };

  const editFromCard = (payload: { id: string; returnTo: string }) => {
    controller.setActionSheet(null);
    controller.router.push(`/novo?appointmentId=${payload.id}&returnTo=${encodeURIComponent(payload.returnTo)}`);
  };

  const deleteFromCard = async (payload: { id: string }) => {
    setPendingDeleteAppointmentId(payload.id);
    setNotifyClientOnDelete(false);
    setDeleteConfirmOpen(true);
    controller.setActionSheet(null);
  };

  const handleConfirmDeleteFromCard = async () => {
    if (!pendingDeleteAppointmentId) return;
    controller.setIsActionPending(true);
    const result = await controller.cancelAppointment(pendingDeleteAppointmentId, {
      notifyClient: notifyClientOnDelete,
    });
    if (!result.ok) {
      controller.showToast(controller.feedbackFromError(result.error, "agenda"));
    } else {
      controller.showToast(controller.feedbackById("appointment_deleted"));
      controller.setActionSheet(null);
      controller.router.refresh();
      setDeleteConfirmOpen(false);
      setPendingDeleteAppointmentId(null);
      setNotifyClientOnDelete(false);
    }
    controller.setIsActionPending(false);
  };

  return (
    <>
      <ModulePage
        header={
          <MobileAgendaHeader
            headerCompact={controller.headerCompact}
            isOnline={controller.isOnline}
            currentMonth={controller.currentMonth}
            currentUserName={controller.currentUserName}
            currentUserAvatarUrl={controller.currentUserAvatarUrl}
            view={controller.view}
            dayLayoutMode={dayLayoutMode}
            monthPickerYear={controller.monthPickerYear}
            monthLabels={controller.monthLabels}
            isMonthPickerOpen={controller.isMonthPickerOpen}
            onCloseMonthPickerAction={() => controller.setIsMonthPickerOpen(false)}
            onOpenSearchAction={() => {
              controller.setSearchMode("quick");
              controller.setIsSearchOpen(true);
            }}
            onTriggerLoadingPreviewAction={triggerLoadingPreview}
            onSetViewAction={controller.setViewAndSync}
            onSetDayLayoutModeAction={setDayLayoutMode}
            onPrevYearAction={() => controller.setMonthPickerYear((prev) => prev - 1)}
            onNextYearAction={() => controller.setMonthPickerYear((prev) => prev + 1)}
            onSelectMonthAction={(monthIndex) => {
              const next = new Date(controller.monthPickerYear, monthIndex, 1);
              controller.setCurrentMonth(next);
              controller.setSelectedDate(next);
              controller.setViewAndSync(controller.view, next);
              controller.setIsMonthPickerOpen(false);
            }}
          />
        }
        contentClassName="relative"
      >
        <main className="relative wl-surface-screen overflow-x-hidden">
          <MobileAgendaDaySection
            visible={controller.view === "day"}
            monthDays={controller.monthDays}
            now={controller.now}
            timeGridConfig={controller.timeGridConfig}
            timeSlots={controller.timeSlots}
            slotHeight={controller.slotHeight}
            timelineHeight={controller.timelineHeight}
            timelineLeftOffset={controller.timelineLeftOffset}
            timeColumnWidth={controller.timeColumnWidth}
            timeColumnGap={controller.timeColumnGap}
            loadingAppointmentId={controller.loadingAppointmentId}
            suppressInlineCardLoading={controller.detailsBlockingVisible}
            highlightAppointmentId={controller.highlightAppointmentId}
            daySliderRef={controller.daySliderRef}
            onDayScroll={controller.handleDayScroll}
            onGoToToday={controller.handleGoToToday}
            onOpenAppointment={controller.openDetailsForAppointment}
            onOpenMonthPickerAction={() => controller.setIsMonthPickerOpen(true)}
            dayLayoutMode={dayLayoutMode}
            signalPercentage={controller.signalPercentage}
            onOpenRecordFromCard={openRecordFromCard}
            onEditFromCard={editFromCard}
            onDeleteFromCard={deleteFromCard}
            getDayData={controller.getDayData}
          />

          <MobileAgendaWeekSection
            visible={controller.view === "week"}
            selectedDate={controller.selectedDate}
            signalPercentage={controller.signalPercentage}
            weekDays={controller.weekDays}
            getDayDataAction={controller.getDayData}
            onChangeSelectedDateAction={controller.setSelectedDate}
            onOpenAppointmentAction={controller.openDetailsForAppointment}
            onOpenRecordFromCard={openRecordFromCard}
            onEditFromCard={editFromCard}
            onDeleteFromCard={deleteFromCard}
            onOpenDayAction={(day) => {
              controller.setSelectedDate(day);
              controller.setViewAndSync("day", day);
              controller.setIsMonthPickerOpen(false);
            }}
          />

          <section className={`${controller.view === "month" ? "block" : "hidden"} p-6 pb-0 animate-in fade-in`}>
            <AvailabilityManager ref={controller.availabilityRef} />
          </section>

          <BlockingOverlay
            visible={isLoadingPreviewVisible || controller.detailsBlockingVisible}
            label={
              isLoadingPreviewVisible
                ? "Carregando experiencia personalizada..."
                : "Abrindo agendamento..."
            }
            variant="brand-draw"
          />
        </main>
      </ModulePage>

      <MobileAgendaOverlays
        toast={controller.toast}
        actionSheet={controller.actionSheet}
        portalTarget={controller.portalTarget}
        isActionPending={controller.isActionPending}
        onCloseActionSheetAction={() => controller.setActionSheet(null)}
        onOpenRecordAction={openRecordFromCard}
        onEditAction={editFromCard}
        onDeleteAction={deleteFromCard}
        deleteConfirmOpen={deleteConfirmOpen}
        notifyClientOnDelete={notifyClientOnDelete}
        onCloseDeleteConfirmAction={() => {
          setDeleteConfirmOpen(false);
          setPendingDeleteAppointmentId(null);
          setNotifyClientOnDelete(false);
        }}
        onChangeNotifyClientOnDeleteAction={setNotifyClientOnDelete}
        onConfirmDeleteAction={() => void handleConfirmDeleteFromCard()}
        searchOpen={controller.isSearchOpen}
        searchTerm={controller.searchTerm}
        isSearching={controller.isSearching}
        searchResults={controller.searchResults}
        onCloseSearchAction={() => {
          controller.setIsSearchOpen(false);
          controller.setSearchTerm("");
        }}
        onSearchTermChangeAction={controller.setSearchTerm}
        onSearchClickAction={() => controller.setSearchMode("full")}
        onSelectSearchAppointmentAction={(item) => {
          const returnTo = `/?view=${controller.view}&date=${format(controller.selectedDate, "yyyy-MM-dd")}`;
          controller.setIsSearchOpen(false);
          controller.setSearchTerm("");
          controller.router.push(`/atendimento/${item.id}?return=${encodeURIComponent(returnTo)}`);
        }}
        onSelectSearchClientAction={(client) => {
          controller.setIsSearchOpen(false);
          controller.setSearchTerm("");
          controller.router.push(`/clientes/${client.id}`);
        }}
        detailsOpen={controller.detailsOpen}
        detailsLoading={controller.detailsLoading}
        detailsData={controller.detailsData}
        attendanceCode={controller.detailsAttendanceCode}
        detailsActionPending={controller.detailsActionPending}
        signalPercentage={controller.signalPercentage}
        publicBaseUrl={controller.publicBaseUrl}
        messageTemplates={controller.messageTemplates}
        onCloseDetailsAction={() => {
          controller.closeDetails();
          controller.setDetailsActionPending(false);
        }}
        onStartSessionAction={controller.handleOpenAttendance}
        onSendSurveyAction={controller.handleSendSurvey}
        onSendPaymentChargeAction={controller.handleSendPaymentCharge}
        onSendPaymentReceiptAction={controller.handleSendPaymentReceipt}
        onCancelAppointmentAction={controller.handleCancelAppointment}
        onRecordPaymentAction={controller.handleRecordPayment}
        onSaveEvolutionAction={controller.handleSaveEvolutionFromDetails}
        onStructureEvolutionAction={controller.handleStructureEvolutionFromDetails}
        onNotifyAction={(feedback) => controller.showToast(feedback)}
        selectedDate={controller.selectedDate}
        view={controller.view}
        onOpenBlockModalAction={(dateTarget) => controller.availabilityRef.current?.openBlockModal(dateTarget)}
        onOpenNewClientAction={() => controller.router.push("/clientes/novo")}
        onOpenNewAppointmentAction={(dateParam, returnTo) =>
          controller.router.push(`/novo?date=${dateParam}&returnTo=${encodeURIComponent(returnTo)}`)
        }
      />
    </>
  );
}
