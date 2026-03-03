
import { useEffect } from "react";
import type { SearchResults } from "./agenda-search-modal";

type Params = {
  isSearchOpen: boolean;
  searchTerm: string;
  searchMode: "quick" | "full";
  redirectToLoginAction: (loginUrl?: string | null) => void;
  setIsSearchingAction: (value: boolean) => void;
  setSearchModeAction: (mode: "quick" | "full") => void;
  setSearchResultsAction: (value: SearchResults) => void;
};

export function useMobileAgendaSearchEffect({
  isSearchOpen,
  searchTerm,
  searchMode,
  redirectToLoginAction,
  setIsSearchingAction,
  setSearchModeAction,
  setSearchResultsAction,
}: Params) {
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchModeAction("quick");
      setSearchResultsAction({ appointments: [], clients: [] });
      return;
    }
    const query = searchTerm.trim();
    if (query.length < 3) {
      setSearchResultsAction({ appointments: [], clients: [] });
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setIsSearchingAction(true);
      try {
        const limit = searchMode === "full" ? 20 : 5;
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as SearchResults & {
          loginRequired?: boolean;
          loginUrl?: string | null;
        };
        if (response.status === 401 || data.loginRequired) {
          redirectToLoginAction(data.loginUrl);
          return;
        }
        if (!response.ok) return;
        setSearchResultsAction({
          appointments: data.appointments ?? [],
          clients: data.clients ?? [],
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchResultsAction({ appointments: [], clients: [] });
        }
      } finally {
        setIsSearchingAction(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [
    isSearchOpen,
    redirectToLoginAction,
    searchMode,
    searchTerm,
    setIsSearchingAction,
    setSearchModeAction,
    setSearchResultsAction,
  ]);
}
