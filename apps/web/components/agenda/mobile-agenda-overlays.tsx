"use client";

import { format } from "date-fns";
import type { ComponentProps } from "react";
import { ArrowUpCircle, CalendarPlus, Clock, UserPlus } from "lucide-react";
import { Toast } from "../ui/toast";
import { FloatingActionMenu } from "../ui/floating-action-menu";
import { AppointmentActionSheet } from "./appointment-action-sheet";
import { AgendaSearchModal, type SearchResults } from "./agenda-search-modal";
import { AppointmentDetailsSheet } from "./appointment-details-sheet";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import type { AutoMessageTemplates } from "../../src/shared/auto-messages.types";
import type { UserFeedback } from "../../src/shared/feedback/user-feedback";

type ToastState = ComponentProps<typeof Toast>["toast"];

type MobileAgendaOverlaysProps = {
  toast: ToastState;
  actionSheet: {
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    returnTo: string;
  } | null;
  portalTarget: HTMLElement | null;
  isActionPending: boolean;
  onCloseActionSheet: () => void;
  onEditAction: (payload: { id: string; returnTo: string }) => void;
  onDeleteAction: (payload: { id: string }) => Promise<void>;
  searchOpen: boolean;
  searchTerm: string;
  isSearching: boolean;
  searchResults: SearchResults;
  onCloseSearch: () => void;
  onSearchTermChange: (value: string) => void;
  onSearchClick: () => void;
  onSelectSearchAppointment: (item: { id: string }) => void;
  onSelectSearchClient: (client: { id: string }) => void;
  detailsOpen: boolean;
  detailsLoading: boolean;
  detailsData: AttendanceOverview | null;
  attendanceCode: string | null;
  detailsActionPending: boolean;
  signalPercentage: number;
  publicBaseUrl: string;
  messageTemplates: AutoMessageTemplates;
  onCloseDetails: () => void;
  onStartSession: () => void;
  onSendCreatedMessage: () => void;
  onSendReminder: () => void;
  onSendSurvey: () => void;
  onSendPaymentCharge: () => void;
  onSendPaymentReceipt: (paymentId: string | null) => void;
  onConfirmClient: () => void;
  onCancelAppointment: () => void;
  onRecordPayment: (payload: {
    type: "signal" | "full";
    amount: number;
    method: "pix" | "card" | "cash" | "other";
  }) => void;
  onSaveEvolution: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolution: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
  onNotify: (feedback: UserFeedback) => void;
  selectedDate: Date;
  view: "day" | "week" | "month";
  onOpenBlockModal: (date: Date) => void;
  onOpenNewClient: () => void;
  onOpenNewAppointment: (dateParam: string, returnTo: string) => void;
};

export function MobileAgendaOverlays({
  toast,
  actionSheet,
  portalTarget,
  isActionPending,
  onCloseActionSheet,
  onEditAction,
  onDeleteAction,
  searchOpen,
  searchTerm,
  isSearching,
  searchResults,
  onCloseSearch,
  onSearchTermChange,
  onSearchClick,
  onSelectSearchAppointment,
  onSelectSearchClient,
  detailsOpen,
  detailsLoading,
  detailsData,
  attendanceCode,
  detailsActionPending,
  signalPercentage,
  publicBaseUrl,
  messageTemplates,
  onCloseDetails,
  onStartSession,
  onSendCreatedMessage,
  onSendReminder,
  onSendSurvey,
  onSendPaymentCharge,
  onSendPaymentReceipt,
  onConfirmClient,
  onCancelAppointment,
  onRecordPayment,
  onSaveEvolution,
  onStructureEvolution,
  onNotify,
  selectedDate,
  view,
  onOpenBlockModal,
  onOpenNewClient,
  onOpenNewAppointment,
}: MobileAgendaOverlaysProps) {
  return (
    <>
      <Toast toast={toast} />

      <AppointmentActionSheet
        actionSheet={actionSheet}
        portalTarget={portalTarget}
        isActionPending={isActionPending}
        onClose={onCloseActionSheet}
        onEdit={onEditAction}
        onDelete={onDeleteAction}
      />

      <AgendaSearchModal
        open={searchOpen}
        searchTerm={searchTerm}
        isSearching={isSearching}
        results={searchResults}
        onClose={onCloseSearch}
        onSearchTermChange={onSearchTermChange}
        onSearchClick={onSearchClick}
        onSelectAppointment={onSelectSearchAppointment}
        onSelectClient={onSelectSearchClient}
      />

      <AppointmentDetailsSheet
        open={detailsOpen}
        loading={detailsLoading}
        details={detailsData}
        attendanceCode={attendanceCode}
        actionPending={detailsActionPending}
        signalPercentage={signalPercentage}
        publicBaseUrl={publicBaseUrl}
        messageTemplates={messageTemplates}
        onClose={onCloseDetails}
        onStartSession={onStartSession}
        onSendCreatedMessage={onSendCreatedMessage}
        onSendReminder={onSendReminder}
        onSendSurvey={onSendSurvey}
        onSendPaymentCharge={onSendPaymentCharge}
        onSendPaymentReceipt={onSendPaymentReceipt}
        onConfirmClient={onConfirmClient}
        onCancelAppointment={onCancelAppointment}
        onRecordPayment={onRecordPayment}
        onSaveEvolution={onSaveEvolution}
        onStructureEvolution={onStructureEvolution}
        onNotify={onNotify}
      />

      <FloatingActionMenu
        actions={[
          {
            label: "Lançamentos financeiros",
            icon: <ArrowUpCircle className="w-5 h-5" />,
            disabled: true,
            helper: "Em dev",
          },
          {
            label: "Bloquear horário",
            icon: <Clock className="w-5 h-5" />,
            onClick: () => {
              onOpenBlockModal(selectedDate);
            },
            tone: "neutral",
          },
          {
            label: "Novo Cliente",
            icon: <UserPlus className="w-5 h-5" />,
            onClick: onOpenNewClient,
            tone: "green",
          },
          {
            label: "Novo Agendamento",
            icon: <CalendarPlus className="w-5 h-5" />,
            onClick: () => {
              const dateParam = format(selectedDate, "yyyy-MM-dd");
              const returnTo = `/?view=${view}&date=${dateParam}`;
              onOpenNewAppointment(dateParam, returnTo);
            },
            tone: "neutral",
          },
        ]}
      />
    </>
  );
}
