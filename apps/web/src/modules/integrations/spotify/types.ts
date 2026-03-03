export type SpotifyPlayerAction = "play" | "pause" | "next" | "previous";

export type SpotifyPlayerState = {
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

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

export type SpotifyConnection = {
  accessToken: string;
  enabled: boolean;
  playlistUrl: string | null;
  playlistUri: string | null;
};
