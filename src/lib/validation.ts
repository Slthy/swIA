import { z } from "zod";
import { isSessionAllowedForDate, isValidISODate } from "@/lib/dates";
import { PRACTICE_SESSION_KEYS } from "@/lib/constants";

const scale = z.coerce.number().int().min(1).max(10);
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().pipe(schema).nullable());

const base = {
  activityDate: z.string().refine(isValidISODate, "Choose a valid date."),
  athleteId: z.string().uuid().optional(),
  dateSource: z.enum(["device", "server_fallback", "manual", "staff_backfill"]),
  deviceRecordedAt: z.string().datetime().nullable(),
  deviceTimezone: z.string().max(100).nullable(),
  deviceUtcOffsetMinutes: z.number().int().min(-840).max(840).nullable(),
};

const wellnessSchema = z.object({
  ...base,
  logType: z.literal("wellness"),
  sessionKey: z.literal("daily_wellness"),
  soreness: scale,
  academicStress: scale,
  nutrition: scale,
  restingHr: optionalNumber(z.number().int().min(20).max(250)),
  sleepHours: optionalNumber(z.number().min(0).max(24)),
});

const swimTestMeasurements = {
  pace3x100Seconds: optionalNumber(z.number().positive().max(600)),
  time25ySeconds: optionalNumber(z.number().positive().max(300)),
  time25yBreaststrokeSeconds: optionalNumber(z.number().positive().max(300)),
  time25yFreestyleSeconds: optionalNumber(z.number().positive().max(300)),
  time25yFlySeconds: optionalNumber(z.number().positive().max(300)),
  time25yBackstrokeSeconds: optionalNumber(z.number().positive().max(300)),
  pace3x100BreaststrokeSeconds: optionalNumber(z.number().positive().max(600)),
  pace3x100FreestyleSeconds: optionalNumber(z.number().positive().max(600)),
  pace3x100FlySeconds: optionalNumber(z.number().positive().max(600)),
  pace3x100BackstrokeSeconds: optionalNumber(z.number().positive().max(600)),
  pace3x100ImSeconds: optionalNumber(z.number().positive().max(600)),
  kickCount: optionalNumber(z.number().int().min(0).max(10000)),
  strokeCount: optionalNumber(z.number().int().min(0).max(10000)),
};

const mondayTestSchema = z.object({
  ...base,
  logType: z.literal("monday_test"),
  sessionKey: z.literal("monday_am_test"),
  rpe: scale,
  fatigue: scale,
  ...swimTestMeasurements,
});

const fridayTestSchema = z.object({
  ...base,
  logType: z.literal("friday_test"),
  sessionKey: z.literal("friday_am_test"),
  rpe: scale,
  fatigue: scale,
  ...swimTestMeasurements,
});

const practiceSchema = z.object({
  ...base,
  logType: z.literal("practice"),
  sessionKey: z.enum(PRACTICE_SESSION_KEYS),
  rpe: scale,
  fatigue: scale,
  zone1Minutes: optionalNumber(z.number().min(0).max(360)),
  zone2Minutes: optionalNumber(z.number().min(0).max(360)),
  zone3Minutes: optionalNumber(z.number().min(0).max(360)),
  zone4Minutes: optionalNumber(z.number().min(0).max(360)),
  zone5Minutes: optionalNumber(z.number().min(0).max(360)),
});

export const logInputSchema = z
  .discriminatedUnion("logType", [wellnessSchema, mondayTestSchema, fridayTestSchema, practiceSchema])
  .superRefine((value, context) => {
    if (!isSessionAllowedForDate(value.sessionKey, value.activityDate)) {
      context.addIssue({
        code: "custom",
        path: ["sessionKey"],
        message: "That session is not available on the selected date.",
      });
    }
  });

export type LogInput = z.infer<typeof logInputSchema>;

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9.-]+$/, "Enter a valid username."),
  password: z.string().min(6).max(64),
});

export const dateRangeSchema = z
  .object({
    from: z.string().refine(isValidISODate),
    to: z.string().refine(isValidISODate),
  })
  .refine((value) => value.from <= value.to, { message: "Start date must be before end date." });
