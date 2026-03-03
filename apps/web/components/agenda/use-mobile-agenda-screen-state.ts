
import { startOfMonth } from "date-fns";
import { useRef, useState } from "react";
import { useToast } from "../ui/toast";
import type { AgendaView } from "./mobile-agenda.types";
import type { SearchResults } from "./agenda-search-modal";
import type { AvailabilityManagerHandle } from "../availability-manager";

export function useMobileAgendaScreenState(params: { initialDate: Date; initialView: AgendaView }) {
  const [headerCompact, setHeaderCompact] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedDate, setSelectedDate] = useState(params.initialDate);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(params.initialDate));
  const [view, setView] = useState<AgendaView>(params.initialView);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"quick" | "full">("quick");
  const [searchResults, setSearchResults] = useState<SearchResults>({ appointments: [], clients: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [detailsActionPending, setDetailsActionPending] = useState(false);
  const [actionSheet, setActionSheet] = useState<{
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    returnTo: string;
  } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const { toast, showToast } = useToast();

  const daySliderRef = useRef<HTMLDivElement | null>(null);
  const lastSnapIndex = useRef(0);
  const availabilityRef = useRef<AvailabilityManagerHandle | null>(null);
  const isUserScrolling = useRef(false);
  const skipAutoScrollSync = useRef(false);
  const pendingViewRef = useRef<AgendaView | null>(null);
  const selectedDateRef = useRef<Date>(params.initialDate);
  const scrollIdleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createdToastShown = useRef(false);

  const [now, setNow] = useState<Date | null>(null);

  return {
    headerCompact,
    setHeaderCompact,
    isOnline,
    setIsOnline,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    view,
    setView,
    isMonthPickerOpen,
    setIsMonthPickerOpen,
    isSearchOpen,
    setIsSearchOpen,
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    detailsActionPending,
    setDetailsActionPending,
    actionSheet,
    setActionSheet,
    isActionPending,
    setIsActionPending,
    monthPickerYear,
    setMonthPickerYear,
    portalTarget,
    setPortalTarget,
    toast,
    showToast,
    daySliderRef,
    lastSnapIndex,
    availabilityRef,
    isUserScrolling,
    skipAutoScrollSync,
    pendingViewRef,
    selectedDateRef,
    scrollIdleTimeout,
    createdToastShown,
    now,
    setNow,
  };
}

