"use client";

type SpotifySettingsCardProps = {
  enabled: boolean;
  playlistUrl: string;
  connected: boolean;
  accountName: string;
  disconnecting: boolean;
  onEnabledChangeAction: (value: boolean) => void;
  onPlaylistUrlChangeAction: (value: string) => void;
  onDisconnectAction: () => void;
};

export function SpotifySettingsCard({
  enabled,
  playlistUrl,
  connected,
  accountName,
  disconnecting,
  onEnabledChangeAction,
  onPlaylistUrlChangeAction,
  onDisconnectAction,
}: SpotifySettingsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Spotify (atendimento)</h3>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            name="spotify_enabled"
            checked={enabled}
            onChange={(event) => onEnabledChangeAction(event.target.checked)}
          />
          Habilitado
        </label>
      </div>

      <div>
        <label className="text-[11px] font-bold text-gray-500 uppercase">Playlist padrão</label>
        <input
          type="text"
          name="spotify_playlist_url"
          value={playlistUrl}
          onChange={(event) => onPlaylistUrlChangeAction(event.target.value)}
          placeholder="https://open.spotify.com/playlist/..."
          className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
        />
        <p className="mt-1 text-[10px] text-gray-500">Usada como fallback quando não existir playback ativo.</p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
        <p className="text-[11px] font-bold text-gray-600">Status: {connected ? "Conectado" : "Desconectado"}</p>
        <p className="text-[10px] text-gray-500">
          {connected
            ? `Conta: ${accountName || "Conta conectada"}`
            : "Clique em Conectar Spotify para autorizar a conta."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href="/api/integrations/spotify/connect?returnTo=/configuracoes"
          className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white inline-flex items-center justify-center"
        >
          Conectar Spotify
        </a>
        <button
          type="button"
          onClick={onDisconnectAction}
          disabled={!connected || disconnecting}
          className="h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-50"
        >
          {disconnecting ? "Desconectando..." : "Desconectar"}
        </button>
      </div>
    </div>
  );
}
