"use client";

import type { ClientHistoryEntry } from "../../../../../lib/attendance/attendance-types";

export type SpotifyPlayerAction = "play" | "pause" | "next" | "previous";
export type HistoryFilter = "all" | "past" | "scheduled";
export type SpotifyPlayerSnapshot = {
  connected: boolean;
  enabled: boolean;
  hasActiveDevice: boolean;
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  trackUrl: string | null;
  playlistUrl: string | null;
  deviceName: string | null;
  message: string | null;
};

export const DEFAULT_SPOTIFY_PLAYLIST_URL =
  process.env.NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL ??
  process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL ??
  "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO";

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

export function SpotifyBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1DB954" />
      <path d="M6.5 9.8c3.9-1.1 7.8-.8 10.9.9" stroke="#0F1F16" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7.3 12.4c3.1-.8 6-.5 8.5.8" stroke="#0F1F16" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.2 14.8c2.3-.6 4.4-.3 6.2.7" stroke="#0F1F16" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function formatHistoryDate(startTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(startTime));
}

export function formatHistoryTime(startTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startTime));
}

export function getHistoryLocationLabel(isHomeVisit: boolean | null) {
  if (isHomeVisit) return "Atendimento em domicílio";
  return "Atendimento no estúdio";
}

export function getHistoryHeadlineTag(history: ClientHistoryEntry) {
  if (history.timeline === "future") {
    return { label: "Agendado", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (history.appointment_status === "no_show") {
    return { label: "No-show", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { label: "Concluído", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export function getPaymentStatusMeta(status: string | null) {
  switch (status) {
    case "pending":
      return { label: "Pendente", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotClass: "bg-amber-500" };
    case "partial":
      return { label: "Parcial", badgeClass: "bg-orange-50 text-orange-700 border-orange-200", dotClass: "bg-orange-500" };
    case "paid":
      return { label: "Pago", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500" };
    case "waived":
      return { label: "Liberado", badgeClass: "bg-sky-50 text-sky-700 border-sky-200", dotClass: "bg-sky-500" };
    case "refunded":
      return { label: "Estornado", badgeClass: "bg-slate-100 text-slate-700 border-slate-300", dotClass: "bg-slate-500" };
    default:
      return { label: "Sem status", badgeClass: "bg-stone-100 text-stone-700 border-stone-300", dotClass: "bg-stone-500" };
  }
}

export function extractSpotifyPlaylistId(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("spotify:playlist:")) {
    const id = trimmed.split(":")[2];
    return id?.trim() || null;
  }

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/playlist\/([A-Za-z0-9]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      if (!base64) {
        reject(new Error("Falha ao processar áudio."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao processar áudio."));
    reader.readAsDataURL(blob);
  });
}
