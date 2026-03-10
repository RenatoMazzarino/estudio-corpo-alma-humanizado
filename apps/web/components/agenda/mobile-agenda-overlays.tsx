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
  onCloseActionSheetAction: () => void;
  onEditAction: (payload: { id: string; returnTo: string }) => void;
  onDeleteAction: (payload: { id: string }) => Promise<void>;
  searchOpen: boolean;
  searchTerm: string;
  isSearching: boolean;
  searchResults: SearchResults;
  onCloseSearchAction: () => void;
  onSearchTermChangeAction: (value: string) => void;
  onSearchClickAction: () => void;
  onSelectSearchAppointmentAction: (item: { id: string }) => void;
  onSelectSearchClientAction: (client: { id: string }) => void;
  detailsOpen: boolean;
  detailsLoading: boolean;
  detailsData: AttendanceOverview | null;
  attendanceCode: string | null;
  detailsActionPending: boolean;
  signalPercentage: number;
  publicBaseUrl: string;
  messageTemplates: AutoMessageTemplates;
  onCloseDetailsAction: () => void;
  onStartSessionAction: () => void;
  onSendSurveyAction: () => void;
  onSendPaymentChargeAction: () => void;
  onSendPaymentReceiptAction: (paymentId: string | null) => void;
  onCancelAppointmentAction: () => void;
  onRecordPaymentAction: (payload: {
    type: "signal" | "full";
    amount: number;
    method: "pix" | "card" | "cash" | "other";
  }) => void;
  onSaveEvolutionAction: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolutionAction: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
  onNotifyAction: (feedback: UserFeedback) => void;
  selectedDate: Date;
  view: "day" | "week" | "month";
  onOpenBlockModalAction: (date: Date) => void;
  onOpenNewClientAction: () => void;
  onOpenNewAppointmentAction: (dateParam: string, returnTo: string) => void;
};

export function MobileAgendaOverlays({
  toast,
  actionSheet,
  portalTarget,
  isActionPending,
  onCloseActionSheetAction,
  onEditAction,
  onDeleteAction,
  searchOpen,
  searchTerm,
  isSearching,
  searchResults,
  onCloseSearchAction,
  onSearchTermChangeAction,
  onSearchClickAction,
  onSelectSearchAppointmentAction,
  onSelectSearchClientAction,
  detailsOpen,
  detailsLoading,
  detailsData,
  attendanceCode,
  detailsActionPending,
  signalPercentage,
  publicBaseUrl,
  messageTemplates,
  onCloseDetailsAction,
  onStartSessionAction,
  onSendSurveyAction,
  onSendPaymentChargeAction,
  onSendPaymentReceiptAction,
  onCancelAppointmentAction,
  onRecordPaymentAction,
  onSaveEvolutionAction,
  onStructureEvolutionAction,
  onNotifyAction,
  selectedDate,
  view,
  onOpenBlockModalAction,
  onOpenNewClientAction,
  onOpenNewAppointmentAction,
}: MobileAgendaOverlaysProps) {
  return (
    <>
      <Toast toast={toast} />

      <AppointmentActionSheet
        actionSheet={actionSheet}
        portalTarget={portalTarget}
        isActionPending={isActionPending}
        onCloseAction={onCloseActionSheetAction}
        onEditAction={onEditAction}
        onDeleteAction={onDeleteAction}
      />

      <AgendaSearchModal
        open={searchOpen}
        searchTerm={searchTerm}
        isSearching={isSearching}
        results={searchResults}
        onCloseAction={onCloseSearchAction}
        onSearchTermChangeAction={onSearchTermChangeAction}
        onSearchClickAction={onSearchClickAction}
        onSelectAppointmentAction={onSelectSearchAppointmentAction}
        onSelectClientAction={onSelectSearchClientAction}
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
        onCloseAction={onCloseDetailsAction}
        onStartSessionAction={onStartSessionAction}
        onSendSurveyAction={onSendSurveyAction}
        onSendPaymentChargeAction={onSendPaymentChargeAction}
        onSendPaymentReceiptAction={onSendPaymentReceiptAction}
        onCancelAppointmentAction={onCancelAppointmentAction}
        onRecordPaymentAction={onRecordPaymentAction}
        onSaveEvolutionAction={onSaveEvolutionAction}
        onStructureEvolutionAction={onStructureEvolutionAction}
        onNotifyAction={onNotifyAction}
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
              onOpenBlockModalAction(selectedDate);
            },
            tone: "neutral",
          },
          {
            label: "Novo Cliente",
            icon: <UserPlus className="w-5 h-5" />,
            onClick: onOpenNewClientAction,
            tone: "green",
          },
          {
            label: "Novo Agendamento",
            icon: <CalendarPlus className="w-5 h-5" />,
            onClick: () => {
              const dateParam = format(selectedDate, "yyyy-MM-dd");
              const returnTo = `/?view=${view}&date=${dateParam}`;
              onOpenNewAppointmentAction(dateParam, returnTo);
            },
            tone: "neutral",
          },
        ]}
      />
    </>
  );
}
