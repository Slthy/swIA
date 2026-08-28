import type { SessionKey } from "@/lib/types";

export const APP_NAME = "GW SwimTrack";

export const SESSION_LABELS: Record<SessionKey, string> = {
  daily_wellness: "Morning Wellness",
  monday_am_test: "Monday AM Swim & Test",
  monday_lift: "Monday Lift",
  monday_pm_swim: "Monday PM Swim",
  tuesday_am_swim: "Tuesday AM Swim",
  tuesday_lift: "Tuesday Lift",
  wednesday_am_swim: "Wednesday AM Swim",
  wednesday_pm_swim: "Wednesday PM Swim",
  thursday_am_swim: "Thursday AM Swim",
  thursday_lift: "Thursday Lift",
  friday_am_test: "Friday AM Swim & Test",
  friday_pm_swim: "Friday PM Swim",
  saturday_am_swim: "Saturday AM Swim",
};

export const SESSIONS_BY_WEEKDAY: Record<number, SessionKey[]> = {
  0: ["daily_wellness"],
  1: ["daily_wellness", "monday_am_test", "monday_lift", "monday_pm_swim"],
  2: ["daily_wellness", "tuesday_am_swim", "tuesday_lift"],
  3: ["daily_wellness", "wednesday_am_swim", "wednesday_pm_swim"],
  4: ["daily_wellness", "thursday_am_swim", "thursday_lift"],
  5: ["daily_wellness", "friday_am_test", "friday_pm_swim"],
  6: ["daily_wellness", "saturday_am_swim"],
};

export const PRACTICE_SESSION_KEYS = [
  "monday_lift",
  "monday_pm_swim",
  "tuesday_am_swim",
  "tuesday_lift",
  "wednesday_am_swim",
  "wednesday_pm_swim",
  "thursday_am_swim",
  "thursday_lift",
  "friday_pm_swim",
  "saturday_am_swim",
] as const satisfies readonly SessionKey[];

export const ATHLETE_ROSTER = [
  "Alessandro Borsato",
  "Alex Orris",
  "Andres Brooks",
  "Artur Tobler",
  "Ben Sosnowski",
  "Breuklynn Harris",
  "Bryce Scully",
  "Carla Nunn-Eckert",
  "Carmen Bunt",
  "Christian Dantey",
  "Colleen MacWilliams",
  "Daniel Choi",
  "Efe Isler",
  "Eldad Zamir",
  "Ellie Lydon",
  "Emily Weingust",
  "Gage Boushee",
  "Heitor Reis",
  "Holden Thomas",
  "Isabel Sayag",
  "JJ Phillips",
  "Julia Carpi",
  "Justin Dostal",
  "Kaan Varol",
  "Maika Ognoskie",
  "Marcella Orlandini",
  "Matija Radjenovic",
  "Meg Cleaver",
  "Merve Tuncel",
  "Mia Hren",
  "Mitchell Bailey",
  "NamAnh Truong",
  "Natalie Sens",
  "Nerea Gutierrez-Steinhauer",
  "Owen Fritts",
  "Shae Stratton",
  "Shoon Li",
  "Soraya Ebrahimi",
  "Talya Erdogan",
] as const;

export const CHART_COLORS = {
  soreness: "#ef6a67",
  academicStress: "#d99a2b",
  nutrition: "#2f9d78",
  restingHr: "#4a8ecf",
  sleep: "#7559b8",
  load: "#d6a72d",
  zone1: "#2d7db6",
  zone2: "#2d9b66",
  zone3: "#e0b629",
  zone4: "#d97729",
  zone5: "#b83b3b",
} as const;

export function isSessionKey(value: string | null): value is SessionKey {
  return value !== null && value in SESSION_LABELS;
}
