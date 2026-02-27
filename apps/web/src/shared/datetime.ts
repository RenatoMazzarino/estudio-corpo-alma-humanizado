export function getRemainingSeconds(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(Math.floor(diff / 1000), 0);
}

export function formatMinutesSeconds(totalSeconds: number) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
