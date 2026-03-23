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
  detailsBlockingVisible: boolean;
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
  const [detailsBlockingVisible, setDetailsBlockingVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<AttendanceOverview | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const detailsOverlayHideTimeoutRef = useRef<number | null>(null);
  const detailsAutoOpenTimeoutRef = useRef<number | null>(null);
  const autoOpenedAppointmentRef = useRef<string | null>(null);

  const refreshAttendanceDetails = useCallback(
    async (appointmentId: string) => {
      setDetailsLoading(true);
      if (detailsOverlayHideTimeoutRef.current) {
        window.clearTimeout(detailsOverlayHideTimeoutRef.current);
        detailsOverlayHideTimeoutRef.current = null;
      }

      let resolvedData: AttendanceOverview | null = null;

      try {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const data = await getAttendance(appointmentId);
          if (data) {
            resolvedData = data;
            break;
          }
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 350 + attempt * 150));
          }
        }

        if (!resolvedData) {
          throw new Error("details_unavailable");
        }

        setDetailsData(resolvedData);
      } catch {
        showToast(
          feedbackById("agenda_details_load_failed", {
            message: "Nao foi possivel carregar os detalhes agora. Tente abrir novamente.",
          })
        );
        setDetailsData(null);
      } finally {
        setDetailsLoading(false);
        setLoadingAppointmentId(null);
        detailsOverlayHideTimeoutRef.current = window.setTimeout(() => {
          setDetailsBlockingVisible(false);
          detailsOverlayHideTimeoutRef.current = null;
        }, 220);
      }
    },
    [showToast]
  );

  const openDetailsForAppointment = useCallback((appointmentId: string) => {
    if (detailsOverlayHideTimeoutRef.current) {
      window.clearTimeout(detailsOverlayHideTimeoutRef.current);
      detailsOverlayHideTimeoutRef.current = null;
    }
    setDetailsBlockingVisible(true);
    setLoadingAppointmentId(appointmentId);
    setDetailsAppointmentId(appointmentId);
    setDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    if (detailsOverlayHideTimeoutRef.current) {
      window.clearTimeout(detailsOverlayHideTimeoutRef.current);
      detailsOverlayHideTimeoutRef.current = null;
    }
    if (detailsAutoOpenTimeoutRef.current) {
      window.clearTimeout(detailsAutoOpenTimeoutRef.current);
      detailsAutoOpenTimeoutRef.current = null;
    }
    setDetailsOpen(false);
    setDetailsAppointmentId(null);
    setDetailsData(null);
    setDetailsLoading(false);
    setLoadingAppointmentId(null);
    setDetailsBlockingVisible(false);
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
      setDetailsBlockingVisible(true);
      setLoadingAppointmentId(appointmentToOpen);
    } else {
      const targetDate = parseAgendaDate(targetAppointment.start_time);
      if (isValid(targetDate) && !isSameDay(targetDate, selectedDateRef.current)) {
        setSelectedDate(targetDate);
        setCurrentMonth(startOfMonth(targetDate));
      }
    }

    autoOpenedAppointmentRef.current = appointmentToOpen;
    const delayMs = searchParams.get("fromAttendance") === "1" ? 120 : 0;
    if (detailsAutoOpenTimeoutRef.current) {
      window.clearTimeout(detailsAutoOpenTimeoutRef.current);
      detailsAutoOpenTimeoutRef.current = null;
    }
    detailsAutoOpenTimeoutRef.current = window.setTimeout(() => {
      openDetailsForAppointment(appointmentToOpen);
      detailsAutoOpenTimeoutRef.current = null;
    }, delayMs);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("openAppointment");
    params.delete("fromAttendance");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [
    appointments,
    openDetailsForAppointment,
    router,
    searchParams,
    selectedDateRef,
    setCurrentMonth,
    setSelectedDate,
  ]);

  useEffect(() => {
    return () => {
      if (detailsOverlayHideTimeoutRef.current) {
        window.clearTimeout(detailsOverlayHideTimeoutRef.current);
      }
      if (detailsAutoOpenTimeoutRef.current) {
        window.clearTimeout(detailsAutoOpenTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadingAppointmentId,
    detailsBlockingVisible,
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
