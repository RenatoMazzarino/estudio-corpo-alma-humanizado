import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  blobToBase64,
  DEFAULT_SPOTIFY_PLAYLIST_URL,
  extractSpotifyPlaylistId,
  pickRecordingMimeType,
  type SpotifyPlayerAction,
  type SpotifyPlayerSnapshot,
} from "./session-stage.helpers";

interface UseSessionStageMediaParams {
  hasSavedEvolution: boolean;
  evolutionText: string;
  onChangeEvolutionText: (value: string) => void;
  onTranscribeAudio: (payload: { audioBase64: string; mimeType: string }) => Promise<string | null>;
  onStructureWithFlora: (transcript: string) => Promise<void>;
  onSaveEvolution: () => Promise<boolean>;
}

interface UseSessionStageMediaReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isStructuring: boolean;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  recordingError: string | null;
  setRecordingError: Dispatch<SetStateAction<string | null>>;
  spotifyState: SpotifyPlayerSnapshot | null;
  spotifyLoading: boolean;
  spotifyActionBusy: boolean;
  spotifyPlaylistUrl: string;
  spotifyPlaylistConfigured: boolean;
  spotifyConnected: boolean;
  spotifyHasDevice: boolean;
  spotifyCanSkip: boolean;
  spotifyCanTogglePlayback: boolean;
  spotifyToggleAction: SpotifyPlayerAction;
  spotifyToggleLabel: string;
  spotifyHeaderSummary: string;
  noteLocked: boolean;
  evolutionHeaderSummary: string;
  stopAudioRecording: () => void;
  handleOpenSpotify: () => void;
  handleSpotifyAction: (action: SpotifyPlayerAction) => Promise<void>;
  refreshSpotifyState: () => Promise<void>;
  handleStructureWithFlora: () => Promise<void>;
  handleSaveEvolution: () => Promise<void>;
  startAudioRecording: () => Promise<void>;
}

export function useSessionStageMedia({
  hasSavedEvolution,
  evolutionText,
  onChangeEvolutionText,
  onTranscribeAudio,
  onStructureWithFlora,
  onSaveEvolution,
}: UseSessionStageMediaParams): UseSessionStageMediaReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const spotifyFetchInFlightRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasSavedEvolution);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [spotifyState, setSpotifyState] = useState<SpotifyPlayerSnapshot | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyActionBusy, setSpotifyActionBusy] = useState(false);

  const spotifyPlaylistUrl = useMemo(() => DEFAULT_SPOTIFY_PLAYLIST_URL.trim(), []);
  const spotifyPlaylistConfigured = useMemo(
    () => Boolean(extractSpotifyPlaylistId(spotifyPlaylistUrl)),
    [spotifyPlaylistUrl]
  );

  const redirectToLogin = useCallback((loginUrl?: string | null) => {
    if (typeof window === "undefined") return;
    const fallbackNext = `${window.location.pathname}${window.location.search}`;
    const fallbackLogin = `/auth/login?reason=forbidden&next=${encodeURIComponent(fallbackNext)}`;
    window.location.assign(loginUrl?.trim() || fallbackLogin);
  }, []);

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

  const fetchSpotifyState = useCallback(
    async (silent = false) => {
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
          loginRequired?: boolean;
          loginUrl?: string | null;
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
        if (response.status === 401 || payload.loginRequired) {
          redirectToLogin(payload.loginUrl);
          return;
        }
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
    },
    [redirectToLogin]
  );

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

  const spotifyConnected = Boolean(spotifyState?.connected && spotifyState?.enabled);
  const spotifyHasDevice = Boolean(spotifyState?.hasActiveDevice);
  const spotifyCanSkip = spotifyConnected && spotifyHasDevice && !spotifyActionBusy;
  const spotifyCanTogglePlayback = spotifyConnected && !spotifyActionBusy;
  const spotifyToggleAction: SpotifyPlayerAction = spotifyState?.isPlaying ? "pause" : "play";
  const spotifyToggleLabel = spotifyState?.isPlaying ? "Pausar" : "Play";
  const spotifyHeaderSummary = spotifyLoading
    ? "Sincronizando Spotify..."
    : spotifyConnected
      ? spotifyState?.isPlaying
        ? "Tocando agora"
        : "Conectado"
      : "Desconectado";
  const noteLocked = hasSavedEvolution && !isEditing;
  const evolutionHeaderSummary = isTranscribing
    ? "Transcrevendo áudio..."
    : isRecording
      ? "Gravando..."
      : noteLocked
        ? "Evolução salva"
        : "Sem salvar";

  const stopAudioRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      setIsRecording(false);
    }
  }, []);

  const handleOpenSpotify = useCallback(() => {
    const targetUrl = spotifyState?.trackUrl?.trim() || spotifyState?.playlistUrl?.trim() || spotifyPlaylistUrl;
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, [spotifyPlaylistUrl, spotifyState?.playlistUrl, spotifyState?.trackUrl]);

  const handleSpotifyAction = useCallback(
    async (action: SpotifyPlayerAction) => {
      setSpotifyActionBusy(true);
      try {
        const response = await fetch("/api/integrations/spotify/player/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          loginRequired?: boolean;
          loginUrl?: string | null;
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

        if (response.status === 401 || payload.loginRequired) {
          redirectToLogin(payload.loginUrl);
          return;
        }

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
    },
    [fetchSpotifyState, redirectToLogin]
  );

  const handleStructureWithFlora = useCallback(async () => {
    if (!evolutionText.trim() || noteLocked) return;
    setIsStructuring(true);
    try {
      await onStructureWithFlora(evolutionText);
    } finally {
      setIsStructuring(false);
    }
  }, [evolutionText, noteLocked, onStructureWithFlora]);

  const handleSaveEvolution = useCallback(async () => {
    if (isRecording || isTranscribing || isStructuring) return;
    const saved = await onSaveEvolution();
    if (saved) {
      setIsEditing(false);
      setRecordingError(null);
    }
  }, [isRecording, isStructuring, isTranscribing, onSaveEvolution]);

  const startAudioRecording = useCallback(async () => {
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
  }, [evolutionText, noteLocked, onChangeEvolutionText, onTranscribeAudio]);

  return {
    isRecording,
    isTranscribing,
    isStructuring,
    isEditing,
    setIsEditing,
    recordingError,
    setRecordingError,
    spotifyState,
    spotifyLoading,
    spotifyActionBusy,
    spotifyPlaylistUrl,
    spotifyPlaylistConfigured,
    spotifyConnected,
    spotifyHasDevice,
    spotifyCanSkip,
    spotifyCanTogglePlayback,
    spotifyToggleAction,
    spotifyToggleLabel,
    spotifyHeaderSummary,
    noteLocked,
    evolutionHeaderSummary,
    stopAudioRecording,
    handleOpenSpotify,
    handleSpotifyAction,
    refreshSpotifyState: async () => {
      await fetchSpotifyState(true);
    },
    handleStructureWithFlora,
    handleSaveEvolution,
    startAudioRecording,
  };
}
