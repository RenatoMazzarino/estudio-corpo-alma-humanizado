"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Mic, Music2, Pause, Play, RotateCw, SkipBack, SkipForward, Sparkles, Square } from "lucide-react";
import type {
  AttendanceRow,
  ChecklistItem,
  ClientHistoryEntry,
  EvolutionEntry,
} from "../../../../../lib/attendance/attendance-types";
import { StageStatusBadge } from "./stage-status";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpotifyPlayerAction = "play" | "pause" | "next" | "previous";
type SpotifyPlayerSnapshot = {
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

interface SessionStageProps {
  attendance: AttendanceRow;
  checklistEnabled: boolean;
  checklist: ChecklistItem[];
  onToggleChecklist: (itemId: string, completed: boolean) => void;
  evolution: EvolutionEntry[];
  clientHistory: ClientHistoryEntry[];
  evolutionText: string;
  onChangeEvolutionText: (value: string) => void;
  onStructureWithFlora: (transcript: string) => Promise<void>;
  onSaveDraft: () => void;
  onPublish: () => void;
}

const DEFAULT_SPOTIFY_PLAYLIST_URL =
  process.env.NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL ??
  process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL ??
  "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO";

function formatHistoryDate(startTime: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(startTime));
}

function extractSpotifyPlaylistId(rawUrl: string) {
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

export function SessionStage({
  attendance,
  checklistEnabled,
  checklist,
  onToggleChecklist,
  evolution,
  clientHistory,
  evolutionText,
  onChangeEvolutionText,
  onStructureWithFlora,
  onSaveDraft,
  onPublish,
}: SessionStageProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingTranscriptRef = useRef("");
  const evolutionTextRef = useRef(evolutionText);

  const [isRecording, setIsRecording] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<ClientHistoryEntry | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(true);
  const [spotifyState, setSpotifyState] = useState<SpotifyPlayerSnapshot | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyActionBusy, setSpotifyActionBusy] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const spotifyFetchInFlightRef = useRef(false);
  const spotifyPlaylistUrl = useMemo(() => DEFAULT_SPOTIFY_PLAYLIST_URL.trim(), []);
  const spotifyPlaylistConfigured = useMemo(() => Boolean(extractSpotifyPlaylistId(spotifyPlaylistUrl)), [spotifyPlaylistUrl]);

  useEffect(() => {
    evolutionTextRef.current = evolutionText;
  }, [evolutionText]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  const fetchSpotifyState = useCallback(async (silent = false) => {
    if (spotifyFetchInFlightRef.current) return;
    spotifyFetchInFlightRef.current = true;
    if (!silent) setSpotifyLoading(true);
    try {
      const response = await fetch("/api/integrations/spotify/player/state", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        connected?: boolean;
        enabled?: boolean;
        hasActiveDevice?: boolean;
        isPlaying?: boolean;
        trackName?: string | null;
        artistName?: string | null;
        trackUrl?: string | null;
        playlistUrl?: string | null;
        deviceName?: string | null;
        message?: string | null;
      };
      setSpotifyState({
        connected: Boolean(payload.connected),
        enabled: Boolean(payload.enabled),
        hasActiveDevice: Boolean(payload.hasActiveDevice),
        isPlaying: Boolean(payload.isPlaying),
        trackName: payload.trackName ?? null,
        artistName: payload.artistName ?? null,
        trackUrl: payload.trackUrl ?? null,
        playlistUrl: payload.playlistUrl ?? null,
        deviceName: payload.deviceName ?? null,
        message: payload.message ?? null,
      });
    } catch {
      setSpotifyState({
        connected: false,
        enabled: false,
        hasActiveDevice: false,
        isPlaying: false,
        trackName: null,
        artistName: null,
        trackUrl: null,
        playlistUrl: null,
        deviceName: null,
        message: "Falha ao carregar estado do Spotify.",
      });
    } finally {
      spotifyFetchInFlightRef.current = false;
      if (!silent) setSpotifyLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSpotifyState();

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchSpotifyState(true);
      }
    };

    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);

    return () => {
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [fetchSpotifyState]);

  const publishedHistory = useMemo(
    () =>
      evolution
        .filter((entry) => entry.status === "published")
        .sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
    [evolution]
  );
  const lastPublished = publishedHistory[0] ?? null;
  const completedChecklistCount = useMemo(
    () => checklist.filter((item) => Boolean(item.completed_at)).length,
    [checklist]
  );
  const spotifyConnected = Boolean(spotifyState?.connected && spotifyState?.enabled);
  const spotifyHasDevice = Boolean(spotifyState?.hasActiveDevice);
  const spotifyCanSkip = spotifyConnected && spotifyHasDevice && !spotifyActionBusy;
  const spotifyCanTogglePlayback = spotifyConnected && !spotifyActionBusy;
  const spotifyToggleAction: SpotifyPlayerAction = spotifyState?.isPlaying ? "pause" : "play";
  const spotifyToggleLabel = spotifyState?.isPlaying ? "Pausar" : "Play";

  const checklistSourceLabel = (source: string | null) => {
    if (!source) return "manual";
    const normalized = source.replace(/_/g, " ").trim().toLowerCase();
    if (normalized === "service preset") return "serviço";
    if (normalized === "default") return "padrão";
    if (normalized === "tenant setting") return "configuração";
    return normalized;
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
  };

  const handleOpenSpotify = () => {
    const targetUrl =
      spotifyState?.trackUrl?.trim() ||
      spotifyState?.playlistUrl?.trim() ||
      spotifyPlaylistUrl;
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleSpotifyAction = async (action: SpotifyPlayerAction) => {
    setSpotifyActionBusy(true);
    try {
      const response = await fetch("/api/integrations/spotify/player/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string | null;
        connected?: boolean;
        enabled?: boolean;
        hasActiveDevice?: boolean;
        isPlaying?: boolean;
        trackName?: string | null;
        artistName?: string | null;
        trackUrl?: string | null;
        playlistUrl?: string | null;
        deviceName?: string | null;
      };

      if (payload.ok) {
        setSpotifyState({
          connected: Boolean(payload.connected),
          enabled: Boolean(payload.enabled),
          hasActiveDevice: Boolean(payload.hasActiveDevice),
          isPlaying: Boolean(payload.isPlaying),
          trackName: payload.trackName ?? null,
          artistName: payload.artistName ?? null,
          trackUrl: payload.trackUrl ?? null,
          playlistUrl: payload.playlistUrl ?? null,
          deviceName: payload.deviceName ?? null,
          message: payload.message ?? null,
        });
      } else {
        setSpotifyState((current) =>
          current
            ? { ...current, message: payload.message ?? "Não foi possível executar comando no Spotify." }
            : {
                connected: false,
                enabled: false,
                hasActiveDevice: false,
                isPlaying: false,
                trackName: null,
                artistName: null,
                trackUrl: null,
                playlistUrl: null,
                deviceName: null,
                message: payload.message ?? "Não foi possível executar comando no Spotify.",
              }
        );
      }
    } catch {
      setSpotifyState((current) =>
        current
          ? { ...current, message: "Falha ao enviar comando para o Spotify." }
          : {
              connected: false,
              enabled: false,
              hasActiveDevice: false,
              isPlaying: false,
              trackName: null,
              artistName: null,
              trackUrl: null,
              playlistUrl: null,
              deviceName: null,
              message: "Falha ao enviar comando para o Spotify.",
            }
      );
    } finally {
      setSpotifyActionBusy(false);
      window.setTimeout(() => {
        void fetchSpotifyState(true);
      }, 1200);
    }
  };

  const handleStructureWithFlora = async () => {
    if (!evolutionText.trim()) return;
    setIsStructuring(true);
    try {
      await onStructureWithFlora(evolutionText);
    } finally {
      setIsStructuring(false);
    }
  };

  const startDictation = async () => {
    setDictationError(null);

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;

    if (!SpeechRecognitionCtor) {
      setDictationError("Seu navegador não suporta ditado por voz nesta tela.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recordingTranscriptRef.current = "";

    recognition.onresult = (event) => {
      let chunk = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim();
        if (result?.isFinal && text) {
          chunk += `${text} `;
        }
      }

      if (!chunk.trim()) return;

      recordingTranscriptRef.current = `${recordingTranscriptRef.current} ${chunk}`.trim();
      onChangeEvolutionText(
        `${evolutionTextRef.current}${evolutionTextRef.current.trim().length > 0 ? "\n" : ""}${chunk.trim()}`.trim()
      );
    };

    recognition.onerror = (event) => {
      setDictationError(event.error ? `Falha no ditado (${event.error}).` : "Falha no ditado.");
    };

    recognition.onend = async () => {
      setIsRecording(false);
      const transcript = recordingTranscriptRef.current.trim();
      if (!transcript) return;

      setIsStructuring(true);
      try {
        await onStructureWithFlora(transcript);
      } finally {
        setIsStructuring(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white bg-white p-3.5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1DB954]/15 text-[#1DB954]">
              <Music2 className="h-4 w-4" />
            </div>
            <p className="truncate text-xs font-extrabold uppercase tracking-wider text-studio-text">
              Player Spotify
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchSpotifyState(true)}
              disabled={spotifyLoading || spotifyActionBusy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-studio-text disabled:opacity-50"
              aria-label="Atualizar estado do player"
            >
              <RotateCw className={`h-3.5 w-3.5 ${spotifyLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenSpotify}
              className="h-8 shrink-0 rounded-lg border border-studio-green/25 bg-white px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-studio-green"
            >
              Abrir app
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-line bg-paper p-3">
          <p className="truncate text-sm font-bold text-studio-text">
            {spotifyState?.trackName
              ? spotifyState.artistName
                ? `${spotifyState.trackName} • ${spotifyState.artistName}`
                : spotifyState.trackName
              : "Nenhuma faixa em reprodução."}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted">
            {spotifyState?.deviceName
              ? `Dispositivo: ${spotifyState.deviceName}`
              : spotifyConnected
                ? "Conta conectada"
                : "Conta não conectada"}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => void handleSpotifyAction("previous")}
              disabled={!spotifyCanSkip}
              className="h-10 rounded-xl border border-line bg-white text-[10px] font-extrabold uppercase tracking-wider text-studio-text inline-flex items-center justify-center disabled:opacity-50"
              aria-label="Faixa anterior"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleSpotifyAction(spotifyToggleAction)}
              disabled={!spotifyCanTogglePlayback}
              className="h-10 rounded-xl border border-studio-green/25 bg-studio-light text-[10px] font-extrabold uppercase tracking-wider text-studio-green inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {spotifyToggleAction === "pause" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {spotifyToggleLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleSpotifyAction("next")}
              disabled={!spotifyCanSkip}
              className="h-10 rounded-xl border border-line bg-white text-[10px] font-extrabold uppercase tracking-wider text-studio-text inline-flex items-center justify-center disabled:opacity-50"
              aria-label="Próxima faixa"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-[10px] font-semibold text-muted">
          {spotifyLoading
            ? "Sincronizando Spotify..."
            : spotifyConnected
              ? spotifyState?.isPlaying
                ? `Tocando agora${spotifyState?.deviceName ? ` no dispositivo ${spotifyState.deviceName}` : ""}.`
                : spotifyHasDevice
                  ? "Player conectado. Toque em play para retomar."
                  : "Abra o Spotify no celular e inicie uma música para habilitar os controles."
              : spotifyState?.message ?? "Spotify não conectado."}
        </p>
        <p className="mt-1 text-[10px] text-muted">
          {spotifyState?.message && spotifyConnected
            ? spotifyState.message
            : spotifyPlaylistConfigured
              ? "Conta conectada. Use os controles para tocar, pausar e trocar a faixa."
              : "Defina uma playlist padrão em Configurações para fallback de reprodução."}
        </p>
      </div>

      {checklistEnabled && (
        <div className="rounded-3xl border border-white bg-white p-4 shadow-soft">
          <button
            type="button"
            onClick={() => setIsChecklistOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-left"
          >
            <div>
              <h2 className="text-sm font-bold text-studio-text">Checklist inicial</h2>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">
                {completedChecklistCount}/{checklist.length} itens concluídos
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted transition-transform ${isChecklistOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div className={`${isChecklistOpen ? "mt-3" : "hidden"}`}>
            {checklist.length === 0 ? (
              <p className="text-xs text-muted">Nenhum item cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-studio-green"
                        checked={Boolean(item.completed_at)}
                        onChange={(event) => onToggleChecklist(item.id, event.target.checked)}
                      />
                      <span className="truncate text-sm font-bold text-studio-text">{item.label}</span>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] font-extrabold uppercase text-muted">
                      {checklistSourceLabel(item.source)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Evolução da sessão</h2>
            <p className="mt-1 text-xs text-muted">Texto livre + ditado por voz.</p>
          </div>
          <div className="flex items-center gap-2">
            <StageStatusBadge status={attendance.session_status} variant="compact" />
            <button
              type="button"
              onClick={handleStructureWithFlora}
              disabled={!evolutionText.trim() || isStructuring}
              aria-label="Organizar texto com Flora"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-studio-green/30 bg-white text-studio-green disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopDictation : startDictation}
              aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                isRecording
                  ? "animate-pulse border-red-200 bg-red-50 text-red-600"
                  : "border-studio-green/30 bg-white text-studio-green"
              }`}
            >
              {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <textarea
          className="mt-4 w-full min-h-44 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-y"
          placeholder="Descreva a evolução da sessão..."
          value={evolutionText}
          onChange={(event) => onChangeEvolutionText(event.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-muted">
            {isStructuring
              ? "Flora está organizando sua evolução..."
              : isRecording
                ? "Gravando. Toque no quadrado para encerrar."
                : "Use o microfone para ditar ou a varinha para organizar o texto."}
          </p>
        </div>
        {dictationError && <p className="mt-2 text-xs text-red-600">{dictationError}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={onSaveDraft}
            type="button"
            className="flex-1 h-12 rounded-2xl bg-paper border border-gray-200 text-gray-700 font-extrabold text-xs hover:bg-gray-50 transition"
          >
            Salvar rascunho
          </button>
          <button
            onClick={onPublish}
            type="button"
            className="flex-1 h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs shadow-lg shadow-green-200 active:scale-95 transition"
          >
            Publicar evolução
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Última publicação</p>
          {lastPublished ? (
            <p className="mt-1 line-clamp-2 text-xs text-studio-text">
              v{lastPublished.version}: {lastPublished.evolution_text || "Registro publicado"}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">Nenhuma publicação ainda.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Histórico do cliente</h2>
            <p className="mt-1 text-xs text-muted">Rolagem interna para acessar sessões anteriores.</p>
          </div>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {clientHistory.length === 0 ? (
            <p className="text-xs text-muted">Sem atendimentos anteriores para este cliente.</p>
          ) : (
            clientHistory.map((item) => (
              <div
                key={item.appointment_id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-muted">
                    {formatHistoryDate(item.start_time)}
                  </p>
                  <p className="truncate text-sm font-bold text-studio-text">{item.service_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(item)}
                  className="h-9 shrink-0 rounded-xl border border-studio-green/30 bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                >
                  Ver anotações
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedHistory &&
        (portalTarget
          ? createPortal(
              <div className="absolute inset-0 z-90 flex items-center justify-center bg-black/45 p-4">
                <div className="w-full max-w-xl rounded-3xl border border-line bg-white p-5 shadow-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-serif font-bold text-studio-text">Anotações da sessão</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedHistory(null)}
                      className="h-8 w-8 rounded-lg border border-line text-sm font-bold text-muted"
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
                    {formatHistoryDate(selectedHistory.start_time)} • {selectedHistory.service_name}
                  </p>
                  <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-paper p-4">
                    <p className="whitespace-pre-wrap text-sm text-studio-text">
                      {selectedHistory.evolution_text?.trim() || "Sem anotações registradas nesta sessão."}
                    </p>
                  </div>
                </div>
              </div>,
              portalTarget
            )
          : (
          <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-line bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-serif font-bold text-studio-text">Anotações da sessão</h3>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(null)}
                  className="h-8 w-8 rounded-lg border border-line text-sm font-bold text-muted"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
                {formatHistoryDate(selectedHistory.start_time)} • {selectedHistory.service_name}
              </p>
              <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-paper p-4">
                <p className="whitespace-pre-wrap text-sm text-studio-text">
                  {selectedHistory.evolution_text?.trim() || "Sem anotações registradas nesta sessão."}
                </p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
