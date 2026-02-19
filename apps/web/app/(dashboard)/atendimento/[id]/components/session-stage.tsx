"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Mic, Music2, Pause, Pencil, Play, RotateCw, SkipBack, SkipForward, Sparkles, Square } from "lucide-react";
import type {
  ChecklistItem,
  ClientHistoryEntry,
} from "../../../../../lib/attendance/attendance-types";
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
  checklistEnabled: boolean;
  checklist: ChecklistItem[];
  onToggleChecklist: (itemId: string, completed: boolean) => void;
  hasSavedEvolution: boolean;
  clientHistory: ClientHistoryEntry[];
  evolutionText: string;
  onChangeEvolutionText: (value: string) => void;
  onTranscribeAudio: (payload: { audioBase64: string; mimeType: string }) => Promise<string | null>;
  onStructureWithFlora: (transcript: string) => Promise<void>;
  onSaveEvolution: () => Promise<boolean>;
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

function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

function blobToBase64(blob: Blob): Promise<string> {
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

export function SessionStage({
  checklistEnabled,
  checklist,
  onToggleChecklist,
  hasSavedEvolution,
  clientHistory,
  evolutionText,
  onChangeEvolutionText,
  onTranscribeAudio,
  onStructureWithFlora,
  onSaveEvolution,
}: SessionStageProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasSavedEvolution);
  const [recordingError, setRecordingError] = useState<string | null>(null);
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
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // noop
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
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

  useEffect(() => {
    setIsEditing(!hasSavedEvolution);
  }, [hasSavedEvolution]);

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
  const noteLocked = hasSavedEvolution && !isEditing;

  const checklistSourceLabel = (source: string | null) => {
    if (!source) return "manual";
    const normalized = source.replace(/_/g, " ").trim().toLowerCase();
    if (normalized === "service preset") return "serviço";
    if (normalized === "default") return "padrão";
    if (normalized === "tenant setting") return "configuração";
    return normalized;
  };

  const stopAudioRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      setIsRecording(false);
    }
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
    if (!evolutionText.trim() || noteLocked) return;
    setIsStructuring(true);
    try {
      await onStructureWithFlora(evolutionText);
    } finally {
      setIsStructuring(false);
    }
  };

  const handleSaveEvolution = async () => {
    if (isRecording || isTranscribing || isStructuring) return;
    const saved = await onSaveEvolution();
    if (saved) {
      setIsEditing(false);
      setRecordingError(null);
    }
  };

  const startAudioRecording = async () => {
    if (noteLocked) return;
    setRecordingError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function" ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("Seu navegador não suporta gravação de áudio nesta tela.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = pickRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError("Não foi possível gravar o áudio. Tente novamente.");
      };

      recorder.onstop = async () => {
        setIsRecording(false);

        const streamTracks = mediaStreamRef.current?.getTracks() ?? [];
        streamTracks.forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        audioChunksRef.current = [];

        if (audioBlob.size < 1024) {
          setRecordingError("Áudio muito curto. Grave novamente.");
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const transcript = (await onTranscribeAudio({ audioBase64, mimeType: finalMimeType }))?.trim() ?? "";
          if (!transcript) {
            setRecordingError("Não foi possível transcrever este áudio.");
            return;
          }

          const currentText = evolutionText.trim();
          const nextText = currentText ? `${currentText}\n\n${transcript}` : transcript;
          onChangeEvolutionText(nextText);
        } catch {
          setRecordingError("Falha ao transcrever o áudio.");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);
    } catch {
      setRecordingError("Não foi possível acessar o microfone.");
    }
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
            <h2 className="text-lg font-serif font-bold text-studio-text">Evolução</h2>
            <p className="mt-1 text-xs text-muted">Grave áudio ou escreva manualmente. Estruture com IA quando quiser.</p>
          </div>
          <div className="flex items-center gap-2">
            {noteLocked && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Editar evolução"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-studio-text"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleStructureWithFlora}
              disabled={!evolutionText.trim() || isStructuring || isTranscribing || noteLocked}
              aria-label="Organizar texto com Flora"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-studio-green/30 bg-white text-studio-green disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
              disabled={isStructuring || isTranscribing || noteLocked}
              aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                isRecording
                  ? "animate-pulse border-red-200 bg-red-50 text-red-600"
                  : "border-studio-green/30 bg-white text-studio-green"
              } disabled:opacity-50`}
            >
              {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <textarea
            className={`w-full min-h-44 rounded-2xl p-4 text-sm text-studio-text border border-line resize-y ${
              noteLocked ? "bg-stone-50" : "bg-paper focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            }`}
            placeholder={noteLocked ? "Clique no ícone de edição para atualizar a evolução." : "Descreva a evolução da sessão..."}
            value={evolutionText}
            onChange={(event) => {
              if (!noteLocked) onChangeEvolutionText(event.target.value);
            }}
            readOnly={noteLocked}
          />
          {isTranscribing && (
            <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-semibold text-studio-text">
                <RotateCw className="h-3.5 w-3.5 animate-spin text-studio-green" />
                Transcrevendo seu áudio com Flora...
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-muted">
            {isTranscribing
              ? "Áudio recebido. Flora está transcrevendo sem estruturar."
              : isStructuring
              ? "Flora está organizando sua evolução..."
              : isRecording
                ? "Gravando. Toque no quadrado para encerrar."
                : noteLocked
                  ? "Evolução salva para esta sessão. Clique no lápis para editar."
                : "Use o microfone para gravar e depois a varinha para estruturar, se quiser."}
          </p>
        </div>
        {recordingError && <p className="mt-2 text-xs text-red-600">{recordingError}</p>}

        {isEditing && (
          <div className="mt-4">
            <button
              onClick={() => void handleSaveEvolution()}
              type="button"
              disabled={isRecording || isTranscribing || isStructuring}
              className="h-12 w-full rounded-2xl bg-studio-green text-white font-extrabold text-xs shadow-lg shadow-green-200 active:scale-95 transition disabled:opacity-50"
            >
              Salvar evolução
            </button>
          </div>
        )}
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
