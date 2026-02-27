import { describe, expect, it } from "vitest";
import {
  formatAgendaDuration,
  getAgendaServiceDuration,
  parseAgendaDate,
} from "./mobile-agenda.helpers";
import type { DayItem } from "./mobile-agenda.types";

describe("parseAgendaDate", () => {
  it("aceita string ISO válida", () => {
    const date = parseAgendaDate("2026-02-27T10:30:00.000Z");
    expect(Number.isNaN(date.getTime())).toBe(false);
  });
});

describe("formatAgendaDuration", () => {
  it("formata minutos e horas", () => {
    expect(formatAgendaDuration(45)).toBe("45min");
    expect(formatAgendaDuration(60)).toBe("1h");
    expect(formatAgendaDuration(95)).toBe("1h 35m");
  });
});

describe("getAgendaServiceDuration", () => {
  it("prioriza service_duration_minutes para agendamento", () => {
    const item = {
      id: "appt_1",
      type: "appointment",
      start_time: "2026-02-27T10:00:00.000Z",
      service_duration_minutes: 80,
    } as unknown as DayItem;

    expect(getAgendaServiceDuration(item)).toBe(80);
  });

  it("calcula bloco com mínimo de 15 minutos", () => {
    const item = {
      id: "block_1",
      type: "block",
      start_time: "2026-02-27T10:00:00.000Z",
      finished_at: "2026-02-27T10:05:00.000Z",
    } as unknown as DayItem;

    expect(getAgendaServiceDuration(item)).toBe(15);
  });
});
