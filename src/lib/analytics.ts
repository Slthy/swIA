import type {
  AnalyticsScope,
  Athlete25yWeek,
  AthleteLog,
  Comparable25yMeasurement,
  Daily25yPoint,
  Daily3x100Point,
  DashboardData,
  DashboardSummary,
  FatiguePoint,
  LoadPoint,
  RecoveryPoint,
  SessionEffortPoint,
  Team25yWeek,
  TestDay,
  WellnessPoint,
  Weekly25yProgression,
  WeeklyRecoveryContext,
  ZonePoint,
} from "@/lib/types";
import { getAnalyticsCriteria, type AnalyticsCriteria } from "@/lib/analytics-criteria";
import { fridayOfWeek, mondayOfWeek } from "@/lib/dates";
import { get25yResult, getSpecific25yResult } from "@/lib/swim-tests";

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function minimum(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  return valid.length ? Math.min(...valid) : null;
}

function median(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value)).sort((left, right) => left - right);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
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

export function buildDashboardData(
  logs: AthleteLog[],
  options: { scope?: AnalyticsScope; criteria?: AnalyticsCriteria; progressionHistory?: AthleteLog[] } = {},
): DashboardData {
  const criteria = options.criteria ?? getAnalyticsCriteria();
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
      log.pace3x100FreestyleSeconds,
    ])),
  };

  return {
    summary,
    wellness: buildWellnessPoints(wellnessLogs),
    recovery: buildRecoveryPoints(wellnessLogs),
    load: buildLoadPoints(sessionLogs, dailyLoadValues),
    zones: buildZonePoints(sorted),
    daily25y: buildDaily25yPoints(sorted),
    daily3x100: buildDaily3x100Points(sorted),
    weekly25y: buildWeekly25yProgression(
      options.progressionHistory ?? sorted,
      options.scope ?? "team",
      criteria,
      sorted,
    ),
    analyticsCriteria: criteria,
    fatigue: buildFatiguePoints(sorted),
    effort: buildSessionEffortPoints(sorted),
  };
}

function buildWeekly25yProgression(
  logs: AthleteLog[],
  scope: AnalyticsScope,
  criteria: AnalyticsCriteria,
  visibleLogs: AthleteLog[] = logs,
): Weekly25yProgression {
  const previous = new Map<string, { date: string; seconds: number }>();
  const measurements = logs
    .filter((log) => log.logType === "monday_test" || log.logType === "friday_test")
    .flatMap((log) => {
      const result = getSpecific25yResult(log);
      return result ? [{ log, result }] : [];
    })
    .sort((left, right) => left.log.activityDate.localeCompare(right.log.activityDate))
    .map(({ log, result }) => {
      const day = log.logType === "monday_test" ? "Monday" as const : "Friday" as const;
      const comparisonKey = `${log.athleteId}:${day}:${result.stroke}`;
      const prior = previous.get(comparisonKey);
      const deltaSeconds = prior ? result.seconds - prior.seconds : null;
      const measurement: Comparable25yMeasurement = {
        date: log.activityDate,
        timeSeconds: result.seconds,
        kickCount: log.kickCount,
        strokeCount: log.strokeCount,
        previousDate: prior?.date ?? null,
        previousTimeSeconds: prior?.seconds ?? null,
        deltaSeconds,
        classification: classifyDelta(deltaSeconds, criteria),
      };
      previous.set(comparisonKey, { date: log.activityDate, seconds: result.seconds });
      return { log, result, day, measurement, weekStart: mondayOfWeek(log.activityDate) };
    });

  const contexts = buildWeeklyContext(logs);
  const visibleLogIds = new Set(visibleLogs.map((log) => log.id));
  const grouped = groupBy(
    measurements.filter(({ log }) => visibleLogIds.has(log.id)),
    ({ log, result, weekStart }) => `${log.athleteId}:${weekStart}:${result.stroke}`,
  );
  const athleteWeeks: Athlete25yWeek[] = [...grouped.values()].map((items) => {
    const monday = items.find((item) => item.day === "Monday")?.measurement ?? null;
    const friday = items.find((item) => item.day === "Friday")?.measurement ?? null;
    return {
      weekStart: items[0].weekStart,
      athleteId: items[0].log.athleteId,
      athleteName: items[0].log.athleteName,
      stroke: items[0].result.stroke,
      monday,
      friday,
      fridayMinusMondaySeconds: monday && friday ? friday.timeSeconds - monday.timeSeconds : null,
      possibleRecoveryMismatch: Boolean(
        monday?.deltaSeconds !== null
        && monday?.deltaSeconds !== undefined
        && friday?.deltaSeconds !== null
        && friday?.deltaSeconds !== undefined
        && monday.deltaSeconds < criteria.stableDeltaLowerSeconds
        && friday.deltaSeconds > criteria.stableDeltaUpperSeconds
      ),
      context: contexts.get(`${items[0].log.athleteId}:${items[0].weekStart}`) ?? emptyRecoveryContext(),
    };
  }).sort((left, right) => left.weekStart.localeCompare(right.weekStart) || left.stroke.localeCompare(right.stroke) || left.athleteName.localeCompare(right.athleteName));

  const teamGroups = groupBy(athleteWeeks, (item) => `${item.weekStart}:${item.stroke}`);
  const teamWeeks: Team25yWeek[] = [...teamGroups.values()].map((items) => ({
    weekStart: items[0].weekStart,
    stroke: items[0].stroke,
    mondayTimeSeconds: median(items.map((item) => item.monday?.timeSeconds)),
    fridayTimeSeconds: median(items.map((item) => item.friday?.timeSeconds)),
    mondayDeltaSeconds: median(items.map((item) => item.monday?.deltaSeconds)),
    fridayDeltaSeconds: median(items.map((item) => item.friday?.deltaSeconds)),
    mondayKickCount: median(items.map((item) => item.monday?.kickCount)),
    fridayKickCount: median(items.map((item) => item.friday?.kickCount)),
    mondayStrokeCount: median(items.map((item) => item.monday?.strokeCount)),
    fridayStrokeCount: median(items.map((item) => item.friday?.strokeCount)),
    mondayAthleteCount: items.filter((item) => item.monday).length,
    fridayAthleteCount: items.filter((item) => item.friday).length,
    comparableAthleteCount: items.filter((item) => item.monday?.deltaSeconds !== null && item.friday?.deltaSeconds !== null).length,
    flaggedAthleteCount: items.filter((item) => item.possibleRecoveryMismatch).length,
    context: medianRecoveryContext(items.map((item) => item.context)),
  })).sort((left, right) => left.weekStart.localeCompare(right.weekStart) || left.stroke.localeCompare(right.stroke));

  return { scope, athleteWeeks, teamWeeks };
}

function classifyDelta(deltaSeconds: number | null, criteria: AnalyticsCriteria) {
  if (deltaSeconds === null) return null;
  if (deltaSeconds < criteria.stableDeltaLowerSeconds) return "faster" as const;
  if (deltaSeconds > criteria.stableDeltaUpperSeconds) return "slower" as const;
  return "stable" as const;
}

function buildWeeklyContext(logs: AthleteLog[]): Map<string, WeeklyRecoveryContext> {
  const grouped = groupBy(logs, (log) => `${log.athleteId}:${mondayOfWeek(log.activityDate)}`);
  return new Map([...grouped.entries()].map(([contextKey, items]) => {
    const monday = mondayOfWeek(items[0].activityDate);
    const friday = fridayOfWeek(items[0].activityDate);
    const practices = items.filter((item) => item.logType === "practice" && item.activityDate >= monday && item.activityDate < friday);
    const mondayWellness = items.find((item) => item.logType === "wellness" && item.activityDate === monday);
    const fridayWellness = items.find((item) => item.logType === "wellness" && item.activityDate === friday);
    return [contextKey, {
      averagePracticeRpe: average(practices.map((item) => item.rpe)),
      averagePracticeFatigue: average(practices.map((item) => item.fatigue)),
      fridaySleepHours: fridayWellness?.sleepHours ?? null,
      fridaySoreness: fridayWellness?.soreness ?? null,
      sleepChange: mondayWellness?.sleepHours !== null && mondayWellness?.sleepHours !== undefined && fridayWellness?.sleepHours !== null && fridayWellness?.sleepHours !== undefined
        ? fridayWellness.sleepHours - mondayWellness.sleepHours
        : null,
      sorenessChange: mondayWellness?.soreness !== null && mondayWellness?.soreness !== undefined && fridayWellness?.soreness !== null && fridayWellness?.soreness !== undefined
        ? fridayWellness.soreness - mondayWellness.soreness
        : null,
    } satisfies WeeklyRecoveryContext] as const;
  }));
}

function emptyRecoveryContext(): WeeklyRecoveryContext {
  return {
    averagePracticeRpe: null,
    averagePracticeFatigue: null,
    fridaySleepHours: null,
    fridaySoreness: null,
    sleepChange: null,
    sorenessChange: null,
  };
}

function medianRecoveryContext(contexts: WeeklyRecoveryContext[]): WeeklyRecoveryContext {
  return {
    averagePracticeRpe: median(contexts.map((item) => item.averagePracticeRpe)),
    averagePracticeFatigue: median(contexts.map((item) => item.averagePracticeFatigue)),
    fridaySleepHours: median(contexts.map((item) => item.fridaySleepHours)),
    fridaySoreness: median(contexts.map((item) => item.fridaySoreness)),
    sleepChange: median(contexts.map((item) => item.sleepChange)),
    sorenessChange: median(contexts.map((item) => item.sorenessChange)),
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

function buildDaily25yPoints(logs: AthleteLog[]): Daily25yPoint[] {
  const testLogs = logs.filter((log) => log.logType === "monday_test" || log.logType === "friday_test");
  const entries = testLogs.flatMap((log) => {
    const result = get25yResult(log);
    return result ? [{ log, result }] : [];
  });
  const grouped = groupBy(entries, ({ log, result }) => `${log.activityDate}:${log.logType}:${result.stroke}`);
  return [...grouped.values()].map((items) => ({
    date: items[0].log.activityDate,
    day: (items[0].log.logType === "monday_test" ? "Monday" : "Friday") as TestDay,
    stroke: items[0].result.stroke,
    timeSeconds: average(items.map((item) => item.result.seconds)) ?? 0,
    kickCount: average(items.map((item) => item.log.kickCount)),
    strokeCount: average(items.map((item) => item.log.strokeCount)),
    athleteCount: new Set(items.map((item) => item.log.athleteId)).size,
  })).sort((left, right) => left.date.localeCompare(right.date) || left.stroke.localeCompare(right.stroke));
}

function buildDaily3x100Points(logs: AthleteLog[]): Daily3x100Point[] {
  const entries = logs.flatMap((log) => {
    if (log.logType !== "monday_test" && log.logType !== "friday_test") return [];
    const paceSeconds = log.pace3x100FreestyleSeconds ?? log.pace3x100Seconds;
    return paceSeconds === null ? [] : [{ log, paceSeconds }];
  });
  const grouped = groupBy(entries, ({ log }) => `${log.activityDate}:${log.logType}`);
  return [...grouped.values()].map((items) => ({
    date: items[0].log.activityDate,
    day: (items[0].log.logType === "monday_test" ? "Monday" : "Friday") as TestDay,
    paceSeconds: average(items.map((item) => item.paceSeconds)) ?? 0,
    athleteCount: new Set(items.map((item) => item.log.athleteId)).size,
  })).sort((left, right) => left.date.localeCompare(right.date));
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

function hasAnyZone(log: AthleteLog): boolean {
  return [log.zone1Minutes, log.zone2Minutes, log.zone3Minutes, log.zone4Minutes, log.zone5Minutes].some(
    (value) => value !== null,
  );
}

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export const analyticsInternals = { average, minimum, median, classifyDelta, buildWeekly25yProgression };
