"use client";

import { format } from "date-fns";
import { ModulePage } from "./ui/module-page";
import { MobileAgendaDaySection } from "./agenda/mobile-agenda-day-section";
import { MobileAgendaWeekSection } from "./agenda/mobile-agenda-week-section";
import { MobileAgendaHeader } from "./agenda/mobile-agenda-header";
import { MobileAgendaOverlays } from "./agenda/mobile-agenda-overlays";
import { AvailabilityManager } from "./availability-manager";
import type { MobileAgendaProps } from "./agenda/mobile-agenda.types";
import { useMobileAgendaScreenController } from "./agenda/use-mobile-agenda-screen-controller";

export function MobileAgenda(props: MobileAgendaProps) {
  const controller = useMobileAgendaScreenController(props);

  return (
    <>
      <ModulePage
        header={
          <MobileAgendaHeader
            headerCompact={controller.headerCompact}
            isOnline={controller.isOnline}
            currentMonth={controller.currentMonth}
            view={controller.view}
            monthPickerYear={controller.monthPickerYear}
            monthLabels={controller.monthLabels}
            isMonthPickerOpen={controller.isMonthPickerOpen}
            onToggleMonthPicker={() => controller.setIsMonthPickerOpen((prev) => !prev)}
            onOpenSearch={() => {
              controller.setSearchMode("quick");
              controller.setIsSearchOpen(true);
            }}
            onSetView={controller.setViewAndSync}
            onPrevYear={() => controller.setMonthPickerYear((prev) => prev - 1)}
            onNextYear={() => controller.setMonthPickerYear((prev) => prev + 1)}
            onSelectMonth={(monthIndex) => {
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
        <main className="relative bg-studio-bg overflow-x-hidden">
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
            daySliderRef={controller.daySliderRef}
            onDayScroll={controller.handleDayScroll}
            onGoToToday={controller.handleGoToToday}
            onOpenAppointment={controller.openDetailsForAppointment}
            onOpenActionSheet={controller.setActionSheet}
            getDayData={controller.getDayData}
          />

          <MobileAgendaWeekSection
            visible={controller.view === "week"}
            selectedDate={controller.selectedDate}
            weekDays={controller.weekDays}
            getDayData={controller.getDayData}
            onChangeSelectedDate={controller.setSelectedDate}
            onOpenDay={(day) => {
              controller.setSelectedDate(day);
              controller.setViewAndSync("day", day);
              controller.setIsMonthPickerOpen(false);
            }}
          />

          <section className={`${controller.view === "month" ? "block" : "hidden"} p-6 pb-0 animate-in fade-in`}>
            <AvailabilityManager ref={controller.availabilityRef} />
          </section>
        </main>
      </ModulePage>

      <MobileAgendaOverlays
        toast={controller.toast}
        actionSheet={controller.actionSheet}
        portalTarget={controller.portalTarget}
        isActionPending={controller.isActionPending}
        onCloseActionSheet={() => controller.setActionSheet(null)}
        onEditAction={(payload) => {
          const nextReturn = payload.returnTo;
          controller.setActionSheet(null);
          controller.router.push(`/novo?appointmentId=${payload.id}&returnTo=${encodeURIComponent(nextReturn)}`);
        }}
        onDeleteAction={async (payload) => {
          controller.setIsActionPending(true);
          const result = await controller.cancelAppointment(payload.id);
          if (!result.ok) {
            controller.showToast(controller.feedbackFromError(result.error, "agenda"));
          } else {
            controller.showToast(controller.feedbackById("appointment_deleted"));
            controller.setActionSheet(null);
            controller.router.refresh();
          }
          controller.setIsActionPending(false);
        }}
        searchOpen={controller.isSearchOpen}
        searchTerm={controller.searchTerm}
        isSearching={controller.isSearching}
        searchResults={controller.searchResults}
        onCloseSearch={() => {
          controller.setIsSearchOpen(false);
          controller.setSearchTerm("");
        }}
        onSearchTermChange={controller.setSearchTerm}
        onSearchClick={() => controller.setSearchMode("full")}
        onSelectSearchAppointment={(item) => {
          const returnTo = `/?view=${controller.view}&date=${format(controller.selectedDate, "yyyy-MM-dd")}`;
          controller.setIsSearchOpen(false);
          controller.setSearchTerm("");
          controller.router.push(`/atendimento/${item.id}?return=${encodeURIComponent(returnTo)}`);
        }}
        onSelectSearchClient={(client) => {
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
        onCloseDetails={() => {
          controller.closeDetails();
          controller.setDetailsActionPending(false);
        }}
        onStartSession={controller.handleOpenAttendance}
        onSendCreatedMessage={() => controller.handleSendMessage("created_confirmation")}
        onSendReminder={controller.handleSendReminder}
        onSendSurvey={controller.handleSendSurvey}
        onSendPaymentCharge={controller.handleSendPaymentCharge}
        onSendPaymentReceipt={controller.handleSendPaymentReceipt}
        onConfirmClient={controller.handleConfirmClient}
        onCancelAppointment={controller.handleCancelAppointment}
        onRecordPayment={controller.handleRecordPayment}
        onSaveEvolution={controller.handleSaveEvolutionFromDetails}
        onStructureEvolution={controller.handleStructureEvolutionFromDetails}
        onNotify={(feedback) => controller.showToast(feedback)}
        selectedDate={controller.selectedDate}
        view={controller.view}
        onOpenBlockModal={(dateTarget) => controller.availabilityRef.current?.openBlockModal(dateTarget)}
        onOpenNewClient={() => controller.router.push("/clientes/novo")}
        onOpenNewAppointment={(dateParam, returnTo) =>
          controller.router.push(`/novo?date=${dateParam}&returnTo=${encodeURIComponent(returnTo)}`)
        }
      />
    </>
  );
}
