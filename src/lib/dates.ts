import { addDays, parseISO, subDays } from "date-fns";
import { SESSIONS_BY_WEEKDAY } from "@/lib/constants";
import type { DateSource, SessionKey } from "@/lib/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DeviceDateContext {
  activityDate: string;
  dateSource: DateSource;
  deviceRecordedAt: string | null;
  deviceTimezone: string | null;
  deviceUtcOffsetMinutes: number | null;
}

export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime()) && toLocalISODate(parsed) === value;
}

export function sessionsForDate(activityDate: string): SessionKey[] {
  if (!isValidISODate(activityDate)) return [];
  const [year, month, day] = activityDate.split("-").map(Number);
  const weekday = new Date(year, month - 1, day, 12).getDay();
  return SESSIONS_BY_WEEKDAY[weekday] ?? [];
}

export function isSessionAllowedForDate(sessionKey: SessionKey, activityDate: string): boolean {
  return sessionsForDate(activityDate).includes(sessionKey);
}

export function mondayOfWeek(activityDate: string): string {
  if (!isValidISODate(activityDate)) return activityDate;
  const date = parseISO(activityDate);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return toLocalISODate(subDays(date, daysSinceMonday));
}

export function fridayOfWeek(activityDate: string): string {
  const monday = mondayOfWeek(activityDate);
  return isValidISODate(monday) ? toLocalISODate(addDays(parseISO(monday), 4)) : activityDate;
}

export function getDeviceDateContext(now = new Date()): DeviceDateContext {
  const isUsable = !Number.isNaN(now.getTime());
  if (!isUsable) {
    const fallback = new Date();
    return {
      activityDate: fallback.toISOString().slice(0, 10),
      dateSource: "server_fallback",
      deviceRecordedAt: null,
      deviceTimezone: null,
      deviceUtcOffsetMinutes: null,
    };
  }

  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  return {
    activityDate: toLocalISODate(now),
    dateSource: "device",
    deviceRecordedAt: now.toISOString(),
    deviceTimezone: timezone,
    deviceUtcOffsetMinutes: -now.getTimezoneOffset(),
  };
}
