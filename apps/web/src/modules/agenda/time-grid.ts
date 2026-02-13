export type TimeGridConfig = {
  startHour: number;
  endHour: number;
  hourHeight: number;
};

export function getTimeRangeMinutes({ startHour, endHour }: TimeGridConfig) {
  return Math.max(0, (endHour - startHour) * 60);
}

export function getMinutesFromStart(date: Date, config: TimeGridConfig) {
  const startMinutes = config.startHour * 60;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes - startMinutes;
}

export function getOffsetForTime(date: Date, config: TimeGridConfig) {
  const minutes = getMinutesFromStart(date, config);
  const totalMinutes = getTimeRangeMinutes(config);
  if (minutes < 0 || minutes > totalMinutes) return null;
  const pxPerMinute = config.hourHeight / 60;
  return minutes * pxPerMinute;
}

export function getDurationHeight(durationMinutes: number, config: TimeGridConfig) {
  const pxPerMinute = config.hourHeight / 60;
  return Math.max(1, durationMinutes * pxPerMinute);
}
