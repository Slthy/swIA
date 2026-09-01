export type Role = "athlete" | "coach" | "admin";
export type TeamCategory = "men" | "women" | "unassigned";
export type LogType = "wellness" | "monday_test" | "friday_test" | "practice";

export type SessionKey =
  | "daily_wellness"
  | "monday_am_test"
  | "monday_lift"
  | "monday_pm_swim"
  | "tuesday_am_swim"
  | "tuesday_lift"
  | "wednesday_am_swim"
  | "wednesday_pm_swim"
  | "thursday_am_swim"
  | "thursday_lift"
  | "friday_am_test"
  | "friday_pm_swim"
  | "saturday_am_swim";

export type DateSource = "device" | "server_fallback" | "manual" | "staff_backfill";
export type SwimStroke = "breaststroke" | "freestyle" | "fly" | "backstroke" | "im";

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  teamCategory: TeamCategory | null;
  groupIds: string[];
}

export interface AthleteLog {
  id: string;
  athleteId: string;
  athleteName: string;
  logType: LogType;
  sessionKey: SessionKey;
  activityDate: string;
  dateSource: DateSource;
  deviceRecordedAt: string | null;
  deviceTimezone: string | null;
  deviceUtcOffsetMinutes: number | null;
  soreness: number | null;
  academicStress: number | null;
  nutrition: number | null;
  restingHr: number | null;
  sleepHours: number | null;
  rpe: number | null;
  fatigue: number | null;
  pace3x100Seconds: number | null;
  time25ySeconds: number | null;
  time25yBreaststrokeSeconds: number | null;
  time25yFreestyleSeconds: number | null;
  time25yFlySeconds: number | null;
  time25yBackstrokeSeconds: number | null;
  pace3x100BreaststrokeSeconds: number | null;
  pace3x100FreestyleSeconds: number | null;
  pace3x100FlySeconds: number | null;
  pace3x100BackstrokeSeconds: number | null;
  pace3x100ImSeconds: number | null;
  kickCount: number | null;
  strokeCount: number | null;
  zone1Minutes: number | null;
  zone2Minutes: number | null;
  zone3Minutes: number | null;
  zone4Minutes: number | null;
  zone5Minutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  daysTracked: number;
  avgSoreness: number | null;
  avgAcademicStress: number | null;
  avgNutrition: number | null;
  avgSleepHours: number | null;
  avgRestingHr: number | null;
  avgDailyLoad: number | null;
  best25ySeconds: number | null;
  best3x100Seconds: number | null;
}

export interface WellnessPoint {
  date: string;
  soreness: number | null;
  academicStress: number | null;
  nutrition: number | null;
}

export interface RecoveryPoint {
  date: string;
  restingHr: number | null;
  sleepHours: number | null;
}

export interface LoadPoint {
  date: string;
  dailyLoad: number;
  sessions: Partial<Record<SessionKey, number>>;
}

export interface ZonePoint {
  date: string;
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export type TestDay = "Monday" | "Friday";

export interface Daily25yPoint {
  date: string;
  day: TestDay;
  stroke: Exclude<SwimStroke, "im"> | "legacy";
  timeSeconds: number;
  kickCount: number | null;
  strokeCount: number | null;
  athleteCount: number;
}

export interface Daily3x100Point {
  date: string;
  day: TestDay;
  paceSeconds: number;
  athleteCount: number;
}

export type AnalyticsScope = "team" | "individual";
export type DeltaClassification = "faster" | "stable" | "slower";
export type ProgressionStroke = Exclude<SwimStroke, "im">;

export interface PublicAnalyticsCriteria {
  stableDeltaLowerSeconds: number;
  stableDeltaUpperSeconds: number;
  defaultWindowWeeks: number;
  windowOptionsWeeks: number[];
  teamAggregation: "median";
}

export interface WeeklyRecoveryContext {
  averagePracticeRpe: number | null;
  averagePracticeFatigue: number | null;
  fridaySleepHours: number | null;
  fridaySoreness: number | null;
  sleepChange: number | null;
  sorenessChange: number | null;
}

export interface Comparable25yMeasurement {
  date: string;
  timeSeconds: number;
  kickCount: number | null;
  strokeCount: number | null;
  previousDate: string | null;
  previousTimeSeconds: number | null;
  deltaSeconds: number | null;
  classification: DeltaClassification | null;
}

export interface Athlete25yWeek {
  weekStart: string;
  athleteId: string;
  athleteName: string;
  stroke: ProgressionStroke;
  monday: Comparable25yMeasurement | null;
  friday: Comparable25yMeasurement | null;
  fridayMinusMondaySeconds: number | null;
  possibleRecoveryMismatch: boolean;
  context: WeeklyRecoveryContext;
}

export interface Team25yWeek {
  weekStart: string;
  stroke: ProgressionStroke;
  mondayTimeSeconds: number | null;
  fridayTimeSeconds: number | null;
  mondayDeltaSeconds: number | null;
  fridayDeltaSeconds: number | null;
  mondayKickCount: number | null;
  fridayKickCount: number | null;
  mondayStrokeCount: number | null;
  fridayStrokeCount: number | null;
  mondayAthleteCount: number;
  fridayAthleteCount: number;
  comparableAthleteCount: number;
  flaggedAthleteCount: number;
  context: WeeklyRecoveryContext;
}

export interface Weekly25yProgression {
  scope: AnalyticsScope;
  athleteWeeks: Athlete25yWeek[];
  teamWeeks: Team25yWeek[];
}

export interface FatiguePoint {
  date: string;
  sessionKey: SessionKey;
  fatigue: number;
}

export interface SessionEffortPoint {
  date: string;
  sessionKey: SessionKey;
  rpe: number | null;
  fatigue: number | null;
}

export interface EffortOutlierMetric {
  athleteValue: number;
  peerMedian: number;
  difference: number;
  peerCount: number;
}

export interface EffortOutlier {
  date: string;
  sessionKey: SessionKey;
  athleteId: string;
  athleteName: string;
  rpe: EffortOutlierMetric | null;
  fatigue: EffortOutlierMetric | null;
}

export interface DashboardData {
  summary: DashboardSummary;
  wellness: WellnessPoint[];
  recovery: RecoveryPoint[];
  load: LoadPoint[];
  zones: ZonePoint[];
  daily25y: Daily25yPoint[];
  daily3x100: Daily3x100Point[];
  weekly25y: Weekly25yProgression;
  analyticsCriteria: PublicAnalyticsCriteria;
  fatigue: FatiguePoint[];
  effort: SessionEffortPoint[];
  effortOutliers: EffortOutlier[];
}
