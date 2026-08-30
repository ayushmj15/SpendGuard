import { describe, it, expect } from "vitest";
import {
  formatShort,
  formatMedium,
  formatDayFirst,
  formatMonthYear,
  formatRelative,
  formatTime,
  toISODate,
  todayISO,
  weekdayShort,
} from "@/utils/date";

describe("toISODate", () => {
  it("formats zero-padded yyyy-mm-dd", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISODate(new Date(2026, 11, 20))).toBe("2026-12-20");
  });
});

describe("formatShort", () => {
  it('renders "Aug 5"', () => {
    expect(formatShort(new Date(2026, 7, 5))).toBe("Aug 5");
  });
});

describe("formatMedium", () => {
  it('renders "Aug 5, 2026"', () => {
    expect(formatMedium(new Date(2026, 7, 5))).toBe("Aug 5, 2026");
  });
});

describe("formatDayFirst", () => {
  it('renders "5 Aug 2026"', () => {
    expect(formatDayFirst(new Date(2026, 7, 5))).toBe("5 Aug 2026");
  });
});

describe("formatMonthYear", () => {
  it('renders "August 2026"', () => {
    expect(formatMonthYear(new Date(2026, 7, 5))).toBe("August 2026");
  });
});

describe("formatRelative", () => {
  it("renders Today / Yesterday / short", () => {
    const today = new Date();
    expect(formatRelative(today)).toBe("Today");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelative(yesterday)).toBe("Yesterday");

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(formatRelative(tenDaysAgo)).toMatch(/^[A-Z][a-z]{2} \d+$/);
  });
});

describe("formatTime", () => {
  it('renders 12-hour time with AM/PM', () => {
    expect(formatTime(new Date(2026, 0, 1, 13, 20))).toBe("1:20 PM");
    expect(formatTime(new Date(2026, 0, 1, 0, 5))).toBe("12:05 AM");
  });
});

describe("todayISO / weekdayShort", () => {
  it("renders ISO today and weekday", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weekdayShort(new Date(2026, 7, 9))).toBe("Sun"); // Aug 9 2026 is Sunday
  });
});
