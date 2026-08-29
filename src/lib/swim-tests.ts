import type { AthleteLog } from "@/lib/types";

export type Stroke25 = "breaststroke" | "freestyle" | "fly" | "backstroke";
export type Stroke25OrLegacy = Stroke25 | "legacy";

export const STROKE_25_OPTIONS = [
  { value: "breaststroke", label: "Breaststroke", shortLabel: "Breast" },
  { value: "freestyle", label: "Freestyle", shortLabel: "Free" },
  { value: "fly", label: "Fly", shortLabel: "Fly" },
  { value: "backstroke", label: "Backstroke", shortLabel: "Back" },
] as const satisfies ReadonlyArray<{ value: Stroke25; label: string; shortLabel: string }>;

type StrokeTimes = Pick<AthleteLog,
  | "time25ySeconds"
  | "time25yBreaststrokeSeconds"
  | "time25yFreestyleSeconds"
  | "time25yFlySeconds"
  | "time25yBackstrokeSeconds"
>;

const fields: Array<{ stroke: Stroke25; key: keyof StrokeTimes }> = [
  { stroke: "breaststroke", key: "time25yBreaststrokeSeconds" },
  { stroke: "freestyle", key: "time25yFreestyleSeconds" },
  { stroke: "fly", key: "time25yFlySeconds" },
  { stroke: "backstroke", key: "time25yBackstrokeSeconds" },
];

export function getSpecific25yResult(value: Partial<StrokeTimes>): { stroke: Stroke25; seconds: number } | null {
  const results = fields.flatMap(({ stroke, key }) => {
    const seconds = value[key];
    return typeof seconds === "number" && Number.isFinite(seconds) ? [{ stroke, seconds }] : [];
  });
  return results.length === 1 ? results[0] : null;
}

export function get25yResult(value: Partial<StrokeTimes>): { stroke: Stroke25OrLegacy; seconds: number } | null {
  const specific = getSpecific25yResult(value);
  if (specific) return specific;
  return typeof value.time25ySeconds === "number" && Number.isFinite(value.time25ySeconds)
    ? { stroke: "legacy", seconds: value.time25ySeconds }
    : null;
}

export function stroke25Label(stroke: Stroke25OrLegacy, short = false) {
  if (stroke === "legacy") return "Unspecified";
  const option = STROKE_25_OPTIONS.find((item) => item.value === stroke);
  return short ? option?.shortLabel ?? stroke : option?.label ?? stroke;
}

export function buildMonday25yStrokeSchedule(logs: AthleteLog[]): Record<string, Stroke25> {
  const schedule: Record<string, Stroke25> = {};
  for (const log of logs) {
    if (log.sessionKey !== "monday_am_test") continue;
    const result = getSpecific25yResult(log);
    if (result) schedule[log.activityDate] = result.stroke;
  }
  return schedule;
}
