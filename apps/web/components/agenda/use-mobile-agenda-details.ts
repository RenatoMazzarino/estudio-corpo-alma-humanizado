import { isSameDay, isValid, startOfMonth } from "date-fns";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getAttendance } from "../../app/(dashboard)/atendimento/[id]/actions";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import { feedbackById } from "../../src/shared/feedback/user-feedback";
import { parseAgendaDate } from "./mobile-agenda.helpers";
import type { Appointment } from "./mobile-agenda.types";
import type { ToastInput } from "../ui/toast";

type SearchParamsLike = {
  get: (name: string) => string | null;
  toString: () => string;
};

interface UseMobileAgendaDetailsParams {
  appointments: Appointment[];
  searchParams: SearchParamsLike;
  router: AppRouterInstance;
  selectedDateRef: MutableRefObject<Date>;
  setSelectedDate: Dispatch<SetStateAction<Date>>;
  setCurrentMonth: Dispatch<SetStateAction<Date>>;
  showToast: (input: string | ToastInput) => void;
}

interface UseMobileAgendaDetailsReturn {
  loadingAppointmentId: string | null;
  detailsOpen: boolean;
  setDetailsOpen: Dispatch<SetStateAction<boolean>>;
  detailsAppointmentId: string | null;
  detailsData: AttendanceOverview | null;
  detailsLoading: boolean;
  openDetailsForAppointment: (appointmentId: string) => void;
  refreshAttendanceDetails: (appointmentId: string) => Promise<void>;
  closeDetails: () => void;
}

export function useMobileAgendaDetails({
  appointments,
  searchParams,
  router,
  selectedDateRef,
  setSelectedDate,
  setCurrentMonth,
  showToast,
}: UseMobileAgendaDetailsParams): UseMobileAgendaDetailsReturn {
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<AttendanceOverview | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const autoOpenedAppointmentRef = useRef<string | null>(null);
  const pendingAutoOpenAppointmentRef = useRef<string | null>(null);
  const pendingAutoOpenDelayMsRef = useRef<number>(0);

  const refreshAttendanceDetails = useCallback(
    async (appointmentId: string) => {
      setDetailsLoading(true);
      let timeoutId: number | null = null;
      try {
        const data = await Promise.race([
          getAttendance(appointmentId),
          new Promise<null>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error("details_timeout")), 10000);
          }),
        ]);
        setDetailsData(data ?? null);
      } catch {
        showToast(
          feedbackById("agenda_details_load_failed", {
            message: "Não foi possível carregar os detalhes agora. Tente abrir novamente.",
          })
        );
        setDetailsData(null);
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        setDetailsLoading(false);
        setLoadingAppointmentId(null);
      }
    },
    [showToast]
  );

  const openDetailsForAppointment = useCallback((appointmentId: string) => {
    setLoadingAppointmentId(appointmentId);
    setDetailsAppointmentId(appointmentId);
    setDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setDetailsAppointmentId(null);
    setDetailsData(null);
    setDetailsLoading(false);
    setLoadingAppointmentId(null);
  }, []);

  useEffect(() => {
    if (!detailsOpen || !detailsAppointmentId) {
      setDetailsData(null);
      setDetailsLoading(false);
      setLoadingAppointmentId(null);
      return;
    }
    void refreshAttendanceDetails(detailsAppointmentId);
  }, [detailsOpen, detailsAppointmentId, refreshAttendanceDetails]);

  useEffect(() => {
    const appointmentToOpen = searchParams.get("openAppointment");
    if (!appointmentToOpen) {
      autoOpenedAppointmentRef.current = null;
      return;
    }
    if (autoOpenedAppointmentRef.current === appointmentToOpen) {
      return;
    }

    const targetAppointment = appointments.find((item) => item.id === appointmentToOpen);
    if (!targetAppointment) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openAppointment");
      params.delete("fromAttendance");
      router.replace(`/?${params.toString()}`, { scroll: false });
      return;
    }

    const targetDate = parseAgendaDate(targetAppointment.start_time);
    if (isValid(targetDate) && !isSameDay(targetDate, selectedDateRef.current)) {
      setSelectedDate(targetDate);
      setCurrentMonth(startOfMonth(targetDate));
    }

    autoOpenedAppointmentRef.current = appointmentToOpen;
    pendingAutoOpenAppointmentRef.current = appointmentToOpen;
    pendingAutoOpenDelayMsRef.current = searchParams.get("fromAttendance") === "1" ? 80 : 0;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("openAppointment");
    params.delete("fromAttendance");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [appointments, router, searchParams, selectedDateRef, setCurrentMonth, setSelectedDate]);

  useEffect(() => {
    if (searchParams.get("openAppointment")) return;
    const pendingAppointmentId = pendingAutoOpenAppointmentRef.current;
    if (!pendingAppointmentId) return;

    pendingAutoOpenAppointmentRef.current = null;
    const delayMs = pendingAutoOpenDelayMsRef.current;
    pendingAutoOpenDelayMsRef.current = 0;

    window.setTimeout(() => {
      openDetailsForAppointment(pendingAppointmentId);
    }, delayMs);
  }, [openDetailsForAppointment, searchParams]);

  return {
    loadingAppointmentId,
    detailsOpen,
    setDetailsOpen,
    detailsAppointmentId,
    detailsData,
    detailsLoading,
    openDetailsForAppointment,
    refreshAttendanceDetails,
    closeDetails,
  };
}
