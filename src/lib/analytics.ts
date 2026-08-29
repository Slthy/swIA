import type {
  AthleteLog,
  DashboardData,
  DashboardSummary,
  FatiguePoint,
  LoadPoint,
  RecoveryPoint,
  SessionEffortPoint,
  SwimTestPoint,
  WellnessPoint,
  Weekly25yPoint,
  ZonePoint,
} from "@/lib/types";
import { mondayOfWeek } from "@/lib/dates";
import { get25yResult } from "@/lib/swim-tests";

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function minimum(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

function key(athleteId: string, date: string) {
  return `${athleteId}:${date}`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const itemKey = getKey(item);
    grouped.set(itemKey, [...(grouped.get(itemKey) ?? []), item]);
  }
  return grouped;
}

export function buildDashboardData(logs: AthleteLog[]): DashboardData {
  const sorted = [...logs].sort((a, b) => a.activityDate.localeCompare(b.activityDate));
  const wellnessLogs = sorted.filter((log) => log.logType === "wellness");
  const sessionLogs = sorted.filter((log) => log.rpe !== null);

  const athleteDayLoads = new Map<string, { date: string; values: number[] }>();
  for (const log of sessionLogs) {
    const mapKey = key(log.athleteId, log.activityDate);
    const current = athleteDayLoads.get(mapKey) ?? { date: log.activityDate, values: [] };
    current.values.push(log.rpe as number);
    athleteDayLoads.set(mapKey, current);
  }

  const dailyLoadValues = [...athleteDayLoads.values()].map((item) => ({ date: item.date, value: average(item.values) as number }));

  const summary: DashboardSummary = {
    daysTracked: new Set(sorted.map((log) => log.activityDate)).size,
    avgSoreness: average(wellnessLogs.map((log) => log.soreness)),
    avgAcademicStress: average(wellnessLogs.map((log) => log.academicStress)),
    avgNutrition: average(wellnessLogs.map((log) => log.nutrition)),
    avgSleepHours: average(wellnessLogs.map((log) => log.sleepHours)),
    avgRestingHr: average(wellnessLogs.map((log) => log.restingHr)),
    avgDailyLoad: average(dailyLoadValues.map((item) => item.value)),
    best25ySeconds: minimum(sorted.flatMap((log) => [
      log.time25ySeconds,
      log.time25yBreaststrokeSeconds,
      log.time25yFreestyleSeconds,
      log.time25yFlySeconds,
      log.time25yBackstrokeSeconds,
    ])),
    best3x100Seconds: minimum(sorted.flatMap((log) => [
      log.pace3x100Seconds,
      log.pace3x100BreaststrokeSeconds,
      log.pace3x100FreestyleSeconds,
      log.pace3x100FlySeconds,
      log.pace3x100BackstrokeSeconds,
      log.pace3x100ImSeconds,
    ])),
  };

  return {
    summary,
    wellness: buildWellnessPoints(wellnessLogs),
    recovery: buildRecoveryPoints(wellnessLogs),
    load: buildLoadPoints(sessionLogs, dailyLoadValues),
    zones: buildZonePoints(sorted),
    swimTests: buildSwimTestPoints(sorted),
    fatigue: buildFatiguePoints(sorted),
    effort: buildSessionEffortPoints(sorted),
    weekly25y: buildWeekly25yPoints(sorted),
  };
}

function buildRecoveryPoints(logs: AthleteLog[]): RecoveryPoint[] {
  const grouped = groupBy(logs, (log) => log.activityDate);
  return [...grouped.entries()].map(([date, items]) => ({
    date,
    restingHr: average(items.map((item) => item.restingHr)),
    sleepHours: average(items.map((item) => item.sleepHours)),
  }));
}

function buildWellnessPoints(logs: AthleteLog[]): WellnessPoint[] {
  const grouped = groupBy(logs, (log) => log.activityDate);
  return [...grouped.entries()].map(([date, items]) => ({
    date,
    soreness: average(items.map((item) => item.soreness)),
    academicStress: average(items.map((item) => item.academicStress)),
    nutrition: average(items.map((item) => item.nutrition)),
  }));
}

function buildLoadPoints(logs: AthleteLog[], dailyValues: Array<{ date: string; value: number }>): LoadPoint[] {
  const dates = [...new Set(dailyValues.map((item) => item.date))].sort();
  return dates.map((date) => {
    const dateLogs = logs.filter((log) => log.activityDate === date);
    const sessions: LoadPoint["sessions"] = {};
    for (const sessionKey of new Set(dateLogs.map((log) => log.sessionKey))) {
      sessions[sessionKey] = average(dateLogs.filter((log) => log.sessionKey === sessionKey).map((log) => log.rpe)) ?? undefined;
    }
    return {
      date,
      dailyLoad: average(dailyValues.filter((item) => item.date === date).map((item) => item.value)) ?? 0,
      sessions,
    };
  });
}

function buildZonePoints(logs: AthleteLog[]): ZonePoint[] {
  const byAthleteDay = groupBy(logs.filter(hasAnyZone), (log) => key(log.athleteId, log.activityDate));
  const athleteDays = [...byAthleteDay.values()].map((items) => ({
    date: items[0].activityDate,
    zone1: sum(items.map((item) => item.zone1Minutes)),
    zone2: sum(items.map((item) => item.zone2Minutes)),
    zone3: sum(items.map((item) => item.zone3Minutes)),
    zone4: sum(items.map((item) => item.zone4Minutes)),
    zone5: sum(items.map((item) => item.zone5Minutes)),
  }));
  const byDate = groupBy(athleteDays, (item) => item.date);
  return [...byDate.entries()].map(([date, items]) => ({
    date,
    zone1: average(items.map((item) => item.zone1)) ?? 0,
    zone2: average(items.map((item) => item.zone2)) ?? 0,
    zone3: average(items.map((item) => item.zone3)) ?? 0,
    zone4: average(items.map((item) => item.zone4)) ?? 0,
    zone5: average(items.map((item) => item.zone5)) ?? 0,
  }));
}

function buildSwimTestPoints(logs: AthleteLog[]): SwimTestPoint[] {
  const testLogs = logs.filter((log) => log.logType === "monday_test" || log.logType === "friday_test");
  const grouped = groupBy(testLogs, (log) => `${log.activityDate}:${log.logType}`);
  return [...grouped.values()].map((items) => ({
    date: items[0].activityDate,
    session: items[0].logType === "monday_test" ? "Monday AM" : "Friday AM",
    time25ySeconds: average(items.map((item) => item.time25ySeconds)),
    pace3x100Seconds: average(items.map((item) => item.pace3x100Seconds)),
    time25yBreaststrokeSeconds: average(items.map((item) => item.time25yBreaststrokeSeconds)),
    time25yFreestyleSeconds: average(items.map((item) => item.time25yFreestyleSeconds)),
    time25yFlySeconds: average(items.map((item) => item.time25yFlySeconds)),
    time25yBackstrokeSeconds: average(items.map((item) => item.time25yBackstrokeSeconds)),
    pace3x100BreaststrokeSeconds: average(items.map((item) => item.pace3x100BreaststrokeSeconds)),
    pace3x100FreestyleSeconds: average(items.map((item) => item.pace3x100FreestyleSeconds)),
    pace3x100FlySeconds: average(items.map((item) => item.pace3x100FlySeconds)),
    pace3x100BackstrokeSeconds: average(items.map((item) => item.pace3x100BackstrokeSeconds)),
    pace3x100ImSeconds: average(items.map((item) => item.pace3x100ImSeconds)),
    kickCount: average(items.map((item) => item.kickCount)),
    strokeCount: average(items.map((item) => item.strokeCount)),
  }));
}

function buildFatiguePoints(logs: AthleteLog[]): FatiguePoint[] {
  const grouped = groupBy(logs.filter((log) => log.fatigue !== null), (log) => `${log.activityDate}:${log.sessionKey}`);
  return [...grouped.values()].map((items) => ({
    date: items[0].activityDate,
    sessionKey: items[0].sessionKey,
    fatigue: average(items.map((item) => item.fatigue)) ?? 0,
  }));
}

function buildSessionEffortPoints(logs: AthleteLog[]): SessionEffortPoint[] {
  const grouped = groupBy(logs.filter((log) => log.rpe !== null || log.fatigue !== null), (log) => `${log.activityDate}:${log.sessionKey}`);
  return [...grouped.values()].map((items) => ({
    date: items[0].activityDate,
    sessionKey: items[0].sessionKey,
    rpe: average(items.map((item) => item.rpe)),
    fatigue: average(items.map((item) => item.fatigue)),
  }));
}

function buildWeekly25yPoints(logs: AthleteLog[]): Weekly25yPoint[] {
  const testLogs = logs.filter((log) => log.sessionKey === "monday_am_test" || log.sessionKey === "friday_am_test");
  const byAthleteWeek = groupBy(testLogs, (log) => `${log.athleteId}:${mondayOfWeek(log.activityDate)}`);
  const pairs: Weekly25yPoint[] = [];
  for (const items of byAthleteWeek.values()) {
    const monday = items.find((item) => item.sessionKey === "monday_am_test");
    const friday = items.find((item) => item.sessionKey === "friday_am_test");
    if (!monday || !friday) continue;
    const mondayResult = get25yResult(monday);
    const fridayResult = get25yResult(friday);
    if (!mondayResult || !fridayResult || mondayResult.stroke !== fridayResult.stroke) continue;
    pairs.push({
      weekStart: mondayOfWeek(monday.activityDate),
      stroke: mondayResult.stroke,
      athleteId: monday.athleteId,
      athleteName: monday.athleteName,
      mondaySeconds: mondayResult.seconds,
      fridaySeconds: fridayResult.seconds,
      deltaSeconds: roundMetric(fridayResult.seconds - mondayResult.seconds),
    });
  }
  return pairs.sort((left, right) => left.weekStart.localeCompare(right.weekStart)
    || left.stroke.localeCompare(right.stroke)
    || left.athleteName.localeCompare(right.athleteName));
}

function hasAnyZone(log: AthleteLog): boolean {
  return [log.zone1Minutes, log.zone2Minutes, log.zone3Minutes, log.zone4Minutes, log.zone5Minutes].some(
    (value) => value !== null,
  );
}

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function roundMetric(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

export const analyticsInternals = { average, minimum };
