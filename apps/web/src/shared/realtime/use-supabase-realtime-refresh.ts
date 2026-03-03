
import { useEffect, useRef } from "react";
import { createClient as createBrowserSupabaseClient } from "../../../lib/supabase/client";

type RealtimeTableConfig = {
  table: string;
  schema?: "public";
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

interface UseSupabaseRealtimeRefreshParams {
  enabled?: boolean;
  channelName: string;
  tables: RealtimeTableConfig[];
  debounceMs?: number;
  onRefresh: () => void;
}

export function useSupabaseRealtimeRefresh({
  enabled = true,
  channelName,
  tables,
  debounceMs = 450,
  onRefresh,
}: UseSupabaseRealtimeRefreshParams) {
  const onRefreshRef = useRef(onRefresh);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(channelName, {
      config: {
        private: false,
      },
    });

    for (const tableConfig of tables) {
      channel.on(
        "postgres_changes",
        {
          event: tableConfig.event ?? "*",
          schema: tableConfig.schema ?? "public",
          table: tableConfig.table,
          filter: tableConfig.filter,
        },
        () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            onRefreshRef.current();
          }, debounceMs);
        }
      );
    }

    channel.subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, enabled, tables]);
}
