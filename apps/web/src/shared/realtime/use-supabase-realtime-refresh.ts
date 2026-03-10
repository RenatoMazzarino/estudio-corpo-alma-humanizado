import { useEffect, useMemo, useRef, useState } from "react";
import { createClient as createBrowserSupabaseClient } from "../../../lib/supabase/client";
import { isFeatureEnabled } from "../feature-flags";

type RealtimeTableConfig = {
  table: string;
  schema?: "public";
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
};

type RealtimeEventPayload = {
  schema: string;
  table: string;
  eventType: string;
  commitTimestamp?: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export type RealtimeChannelStatus = "idle" | "connecting" | "ready" | "degraded";

export type RealtimeChannelHealth = {
  status: RealtimeChannelStatus;
  attempts: number;
  lastError: string | null;
  connectedAt: string | null;
  lastEventAt: string | null;
  nextRetryAt: string | null;
};

interface UseSupabaseRealtimeRefreshParams {
  enabled?: boolean;
  channelName: string;
  tables: RealtimeTableConfig[];
  debounceMs?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  featureKey?: string | null;
  onRefresh?: () => void;
  onEvent?: (event: RealtimeEventPayload) => void;
  onHealthChange?: (health: RealtimeChannelHealth) => void;
}

const INITIAL_HEALTH: RealtimeChannelHealth = {
  status: "idle",
  attempts: 0,
  lastError: null,
  connectedAt: null,
  lastEventAt: null,
  nextRetryAt: null,
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const toIsoAfterMs = (delayMs: number) => new Date(Date.now() + delayMs).toISOString();

const getRetryDelay = (attempt: number, base: number, max: number) => {
  const normalizedAttempt = Math.max(1, Math.min(8, attempt));
  return Math.min(max, base * 2 ** (normalizedAttempt - 1));
};

export function useSupabaseRealtimeRefresh({
  enabled = true,
  channelName,
  tables,
  debounceMs = 450,
  reconnectBaseMs = 1_000,
  reconnectMaxMs = 30_000,
  featureKey = null,
  onRefresh,
  onEvent,
  onHealthChange,
}: UseSupabaseRealtimeRefreshParams) {
  const [health, setHealth] = useState<RealtimeChannelHealth>(INITIAL_HEALTH);
  const onRefreshRef = useRef(onRefresh);
  const onEventRef = useRef(onEvent);
  const onHealthChangeRef = useRef(onHealthChange);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onHealthChangeRef.current = onHealthChange;
  }, [onHealthChange]);

  const shouldUsePatchMode = useMemo(() => {
    if (!onEvent) return false;
    return isFeatureEnabled("FF_REALTIME_PATCH_MODE", {
      key: featureKey?.trim() || channelName,
    });
  }, [channelName, featureKey, onEvent]);

  useEffect(() => {
    let disposed = false;
    let activeChannel: ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null = null;

    const updateHealth = (partial: Partial<RealtimeChannelHealth>) => {
      setHealth((prev) => {
        const next = { ...prev, ...partial };
        onHealthChangeRef.current?.(next);
        return next;
      });
    };

    const clearTimers = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const supabase = createBrowserSupabaseClient();

    const scheduleReconnect = async (attempt: number, reason: string) => {
      if (disposed) return;
      const delay = getRetryDelay(attempt, reconnectBaseMs, reconnectMaxMs);
      updateHealth({
        status: "degraded",
        attempts: attempt,
        lastError: reason,
        nextRetryAt: toIsoAfterMs(delay),
      });

      reconnectTimeoutRef.current = setTimeout(() => {
        void connect(attempt);
      }, delay);
    };

    const emitRefresh = () => {
      if (!onRefreshRef.current) return;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        onRefreshRef.current?.();
      }, debounceMs);
    };

    const connect = async (attempt: number) => {
      if (disposed) return;

      if (activeChannel) {
        await supabase.removeChannel(activeChannel);
        activeChannel = null;
      }

      updateHealth({
        status: attempt === 0 ? "connecting" : "degraded",
        attempts: attempt,
        nextRetryAt: null,
      });

      const channel = supabase.channel(`${channelName}:${attempt}`, {
        config: { private: false },
      });
      activeChannel = channel;

      for (const tableConfig of tables) {
        channel.on(
          "postgres_changes",
          {
            event: tableConfig.event ?? "*",
            schema: tableConfig.schema ?? "public",
            table: tableConfig.table,
            filter: tableConfig.filter,
          },
          (payload: unknown) => {
            const payloadObject = asRecord(payload);
            const normalizedEvent: RealtimeEventPayload = {
              schema:
                typeof payloadObject.schema === "string"
                  ? payloadObject.schema
                  : tableConfig.schema ?? "public",
              table:
                typeof payloadObject.table === "string" ? payloadObject.table : tableConfig.table,
              eventType:
                typeof payloadObject.eventType === "string"
                  ? payloadObject.eventType
                  : tableConfig.event ?? "*",
              commitTimestamp:
                typeof payloadObject.commit_timestamp === "string"
                  ? payloadObject.commit_timestamp
                  : undefined,
              new: asRecord(payloadObject.new),
              old: asRecord(payloadObject.old),
            };

            updateHealth({
              lastEventAt: new Date().toISOString(),
              lastError: null,
            });

            if (shouldUsePatchMode) {
              onEventRef.current?.(normalizedEvent);
              return;
            }
            emitRefresh();
          }
        );
      }

      channel.subscribe(async (status, error) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          updateHealth({
            status: "ready",
            attempts: 0,
            lastError: null,
            connectedAt: new Date().toISOString(),
            nextRetryAt: null,
          });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          const nextAttempt = attempt + 1;
          const message =
            (typeof error?.message === "string" && error.message.trim()) ||
            `Realtime channel status: ${status}`;
          await scheduleReconnect(nextAttempt, message);
        }
      });
    };

    if (!enabled || tables.length === 0) {
      setHealth(INITIAL_HEALTH);
      return () => {
        clearTimers();
      };
    }

    void connect(0);

    return () => {
      disposed = true;
      clearTimers();
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [
    channelName,
    debounceMs,
    enabled,
    reconnectBaseMs,
    reconnectMaxMs,
    shouldUsePatchMode,
    tables,
  ]);

  return {
    health,
    mode: shouldUsePatchMode ? ("patch" as const) : ("refresh" as const),
    isReady: health.status === "ready",
  };
}
