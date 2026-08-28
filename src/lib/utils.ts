import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(/\.0$/, "");
}

export function normalizeUsername(displayName: string): string {
  const normalized = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
  const [first, ...lastParts] = normalized.split(" ");
  return [first, lastParts.join("-")].filter(Boolean).join(".");
}

export function internalEmailForUsername(username: string): string {
  return `${username}@accounts.gw-swimtrack.invalid`;
}
