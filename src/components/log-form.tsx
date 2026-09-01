"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Clock3, Info } from "lucide-react";
import { saveLog } from "@/app/actions/logs";
import { ScaleInput } from "@/components/scale-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import { getDeviceDateContext, sessionsForDate, type DeviceDateContext } from "@/lib/dates";
import { STROKE_25_OPTIONS, type Stroke25 } from "@/lib/swim-tests";
import type { DateSource, LogType, SessionKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Values {
  soreness: number | null; academicStress: number | null; nutrition: number | null;
  restingHr: string; sleepHours: string; sleepMinutes: string; rpe: number | null; fatigue: number | null;
  time25yBreaststrokeMinutes: string; time25yFreestyleMinutes: string; time25yFlyMinutes: string; time25yBackstrokeMinutes: string;
  time25yBreaststrokeSeconds: string; time25yFreestyleSeconds: string; time25yFlySeconds: string; time25yBackstrokeSeconds: string;
  pace3x100FreestyleMinutes: string; pace3x100FreestyleSeconds: string;
  kickCount: string; strokeCount: string;
  zone1Hours: string; zone2Hours: string; zone3Hours: string; zone4Hours: string; zone5Hours: string;
  zone1Minutes: string; zone2Minutes: string; zone3Minutes: string; zone4Minutes: string; zone5Minutes: string;
}

const initialValues: Values = {
  soreness: null, academicStress: null, nutrition: null, restingHr: "", sleepHours: "", sleepMinutes: "", rpe: null, fatigue: null,
  time25yBreaststrokeMinutes: "", time25yFreestyleMinutes: "", time25yFlyMinutes: "", time25yBackstrokeMinutes: "",
  time25yBreaststrokeSeconds: "", time25yFreestyleSeconds: "", time25yFlySeconds: "", time25yBackstrokeSeconds: "",
  pace3x100FreestyleMinutes: "", pace3x100FreestyleSeconds: "",
  kickCount: "", strokeCount: "", zone1Minutes: "", zone2Minutes: "", zone3Minutes: "", zone4Minutes: "", zone5Minutes: "",
  zone1Hours: "", zone2Hours: "", zone3Hours: "", zone4Hours: "", zone5Hours: "",
};

export function LogForm({ initialSession, athleteId, preview = false }: { initialSession?: SessionKey; athleteId?: string; preview?: boolean }) {
  const [context, setContext] = useState<DeviceDateContext | null>(null);
  const [manualDate, setManualDate] = useState(false);
  const [sessionKey, setSessionKey] = useState<SessionKey>("daily_wellness");
  const [values, setValues] = useState(initialValues);
  const [selected25Stroke, setSelected25Stroke] = useState<Stroke25 | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const allowedSessions = useMemo(() => context ? sessionsForDate(context.activityDate) : [], [context]);

  useEffect(() => {
    const device = getDeviceDateContext();
    setContext(device);
    if (initialSession && sessionsForDate(device.activityDate).includes(initialSession)) setSessionKey(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (context && !allowedSessions.includes(sessionKey)) setSessionKey(allowedSessions[0] ?? "daily_wellness");
  }, [allowedSessions, context, sessionKey]);

  useEffect(() => {
    if (sessionKey !== "monday_am_test" && sessionKey !== "friday_am_test") return;
    setSelected25Stroke(null);
    setValues((current) => ({
      ...current,
      time25yBreaststrokeMinutes: "",
      time25yFreestyleMinutes: "",
      time25yFlyMinutes: "",
      time25yBackstrokeMinutes: "",
      time25yBreaststrokeSeconds: "",
      time25yFreestyleSeconds: "",
      time25yFlySeconds: "",
      time25yBackstrokeSeconds: "",
    }));
  }, [context?.activityDate, sessionKey]);

  const logType = logTypeForSession(sessionKey);
  const set = (field: keyof Values, value: string | number) => setValues((current) => ({ ...current, [field]: value }));
  const submit = () => {
    if (!context) return;
    setMessage(null);
    const payload = buildPayload(logType, sessionKey, context, values, athleteId);
    if (preview) { setMessage({ type: "error", text: "Preview mode does not save data. Configure Supabase to enable submissions." }); return; }
    startTransition(async () => {
      let result = await saveLog(payload);
      if (result.status === "duplicate") {
        if (!window.confirm("An entry already exists for this date and session. Replace it with these values?")) return;
        result = await saveLog(payload, true);
      }
      if (result.status === "saved") { setMessage({ type: "success", text: "Entry saved. Your dashboard has been updated." }); setValues(initialValues); }
      else if (result.status === "error") setMessage({ type: "error", text: result.message });
    });
  };

  if (!context) return <div className="surface-card h-[480px] animate-pulse bg-[#edf2f4]" aria-label="Loading device date" />;
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <Card className="p-5 sm:p-7">
      <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">New entry</p><h1 className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#0a304a]">What are you logging?</h1></div><span className="grid size-11 place-items-center rounded-xl bg-[#e4f4f5] text-[#0a6f7e]"><Clock3 className="size-5" /></span></div>
      <div className="space-y-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><span className="mb-2 block text-sm font-semibold text-[#304a5d]">Activity date</span>{manualDate ? <input type="date" value={context.activityDate} onChange={(event) => setContext((current) => current ? ({ ...current, activityDate: event.target.value, dateSource: "manual" }) : current)} className="min-h-12 w-full rounded-xl border border-[#d5e0e5] bg-white px-4 text-sm outline-none focus:border-[#16a5b8]" /> : <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d5e0e5] bg-[#f7fafb] px-4"><CalendarClock className="size-4 text-[#0a6f7e]" /><span className="text-sm font-semibold text-[#304a5d]">{new Date(`${context.activityDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span></div>}<button type="button" onClick={() => { setManualDate((value) => !value); if (manualDate) setContext(getDeviceDateContext()); else setContext((current) => current ? ({ ...current, dateSource: "manual" }) : current); }} className="mt-2 text-xs font-semibold text-[#0a6f7e]">{manualDate ? "Use device date" : "Log another date"}</button></div>
          <label><span className="mb-2 block text-sm font-semibold text-[#304a5d]">Available session</span><span className="relative block"><select value={sessionKey} onChange={(event) => { setSessionKey(event.target.value as SessionKey); setValues(initialValues); }} className="min-h-12 w-full appearance-none rounded-xl border border-[#d5e0e5] bg-white px-4 pr-10 text-sm font-semibold text-[#304a5d] outline-none focus:border-[#16a5b8]">{allowedSessions.map((session) => <option key={session} value={session}>{SESSION_LABELS[session]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#718491]" /></span></label>
        </div>
        <div className="h-px bg-[#e6edef]" />
        {logType === "wellness" && <WellnessFields values={values} set={set} />}
        {(logType === "monday_test" || logType === "friday_test") && <TestFields values={values} set={set} selected25Stroke={selected25Stroke} onSelect25Stroke={(stroke) => {
          setSelected25Stroke(stroke);
          setValues((current) => ({
            ...current,
            time25yBreaststrokeMinutes: "", time25yFreestyleMinutes: "", time25yFlyMinutes: "", time25yBackstrokeMinutes: "",
            time25yBreaststrokeSeconds: "", time25yFreestyleSeconds: "", time25yFlySeconds: "", time25yBackstrokeSeconds: "",
          }));
        }} />}
        {logType === "practice" && <PracticeFields values={values} set={set} />}
        {message && <div role="status" className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm", message.type === "success" ? "bg-emerald-50 text-emerald-750" : "bg-red-50 text-red-700")}>{message.type === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}<span>{message.text}</span></div>}
        <Button type="button" disabled={pending} onClick={submit} className="w-full sm:w-auto">{pending ? "Saving…" : "Save entry"}</Button>
      </div>
    </Card>
    <aside className="space-y-4"><Card className="p-5"><p className="text-sm font-bold text-[#17384d]">Date-aware logging</p><p className="mt-2 text-sm leading-6 text-[#607181]">Sessions come from your device’s local day. Choosing a fallback date immediately updates the available options.</p></Card><Card className="p-5"><p className="text-sm font-bold text-[#17384d]">Optional means optional</p><p className="mt-2 text-sm leading-6 text-[#607181]">Leave a measurement blank if you do not have it. Missing data stays empty and is never plotted as zero.</p></Card></aside>
  </div>;
}

function WellnessFields({ values, set }: FieldProps) {
  return <div className="space-y-7">
    <ScaleInput label="Morning soreness" value={values.soreness} onChange={(value) => set("soreness", value)} lowLabel="1 · Fresh" highLabel="10 · Sore" />
    <ScaleInput label="Academic & life stress" value={values.academicStress} onChange={(value) => set("academicStress", value)} />
    <ScaleInput label="Nutrition & hydration" value={values.nutrition} onChange={(value) => set("nutrition", value)} />
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField label="Resting heart rate" suffix="bpm" value={values.restingHr} onChange={(value) => set("restingHr", value)} min={20} max={250} />
      <HoursMinutesField label="Sleep duration" optional hours={values.sleepHours} minutes={values.sleepMinutes} onHoursChange={(value) => set("sleepHours", value)} onMinutesChange={(value) => set("sleepMinutes", value)} maxHours={23} />
    </div>
  </div>;
}
function TestFields({ values, set, selected25Stroke, onSelect25Stroke }: FieldProps & { selected25Stroke: Stroke25 | null; onSelect25Stroke: (stroke: Stroke25 | null) => void }) {
  const selectedFields = selected25Stroke ? stroke25Fields[selected25Stroke] : null;
  const selectedLabel = STROKE_25_OPTIONS.find((stroke) => stroke.value === selected25Stroke)?.label;
  return <div className="space-y-7">
    <ScaleInput label="Session RPE" value={values.rpe} onChange={(value) => set("rpe", value)} />
    <ScaleInput label="Post-session fatigue" value={values.fatigue} onChange={(value) => set("fatigue", value)} />
    <div>
      <p className="text-sm font-bold text-[#304a5d]">25y time by stroke <span className="font-normal text-[#82929d]">· minutes and seconds</span></p>
      <p className="mt-1 text-xs text-[#82929d]">Assign the stroke used today so the result can be filtered later.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label><span className="mb-2 block text-xs font-semibold text-[#526778]">25y stroke</span><select value={selected25Stroke ?? ""} onChange={(event) => onSelect25Stroke(event.target.value ? event.target.value as Stroke25 : null)} className="min-h-12 w-full rounded-xl border border-[#d5e0e5] bg-white px-3 text-sm font-semibold text-[#304a5d] outline-none"><option value="">Choose a stroke</option>{STROKE_25_OPTIONS.map((stroke) => <option key={stroke.value} value={stroke.value}>{stroke.label}</option>)}</select></label>
        {selectedFields ? <MinutesSecondsField label={`${selectedLabel} time`} minutes={values[selectedFields.minutes] as string} seconds={values[selectedFields.seconds] as string} onMinutesChange={(value) => set(selectedFields.minutes, value)} onSecondsChange={(value) => set(selectedFields.seconds, value)} maxMinutes={4} /> : <div className="grid min-h-20 place-items-center rounded-xl border border-dashed border-[#d5e0e5] bg-[#f9fbfb] px-4 text-center text-xs text-[#82929d]">Choose today’s stroke to enter a 25y time.</div>}
      </div>
    </div>
    <div>
      <p className="text-sm font-bold text-[#304a5d]">3×100 freestyle average pace <span className="font-normal text-[#82929d]">· minutes and seconds</span></p>
      <p className="mt-1 text-xs text-[#82929d]">Enter the average time per 100 for the freestyle set.</p>
      <div className="mt-3 max-w-sm"><MinutesSecondsField label="Freestyle average pace" minutes={values.pace3x100FreestyleMinutes} seconds={values.pace3x100FreestyleSeconds} onMinutesChange={(value) => set("pace3x100FreestyleMinutes", value)} onSecondsChange={(value) => set("pace3x100FreestyleSeconds", value)} maxMinutes={9} /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><NumberField label="Kick count" value={values.kickCount} onChange={(value) => set("kickCount", value)} /><NumberField label="Stroke count" value={values.strokeCount} onChange={(value) => set("strokeCount", value)} /></div>
  </div>;
}

const stroke25Fields: Record<Stroke25, { minutes: keyof Values; seconds: keyof Values }> = {
  breaststroke: { minutes: "time25yBreaststrokeMinutes", seconds: "time25yBreaststrokeSeconds" },
  freestyle: { minutes: "time25yFreestyleMinutes", seconds: "time25yFreestyleSeconds" },
  fly: { minutes: "time25yFlyMinutes", seconds: "time25yFlySeconds" },
  backstroke: { minutes: "time25yBackstrokeMinutes", seconds: "time25yBackstrokeSeconds" },
};
function PracticeFields({ values, set }: FieldProps) { return <div className="space-y-7"><ScaleInput label="Session RPE" value={values.rpe} onChange={(value) => set("rpe", value)} /><ScaleInput label="Post-session fatigue" value={values.fatigue} onChange={(value) => set("fatigue", value)} /><div><p className="mb-3 text-sm font-semibold text-[#304a5d]">Heart-rate zone duration <span className="font-normal text-[#82929d]">· optional</span></p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5].map((zone) => <HoursMinutesField key={zone} label={`Zone ${zone}`} hours={values[`zone${zone}Hours` as keyof Values] as string} minutes={values[`zone${zone}Minutes` as keyof Values] as string} onHoursChange={(value) => set(`zone${zone}Hours` as keyof Values, value)} onMinutesChange={(value) => set(`zone${zone}Minutes` as keyof Values, value)} maxHours={6} />)}</div></div></div>; }

interface FieldProps { values: Values; set: (field: keyof Values, value: string | number) => void }
function NumberField({ label, ariaLabel = label, suffix, value, onChange, min = 0, max, step = "1" }: { label: string; ariaLabel?: string; suffix?: string; value: string; onChange: (value: string) => void; min?: number; max?: number; step?: string }) { return <label><span className="mb-2 block text-xs font-semibold text-[#526778]">{label}</span><span className="flex min-h-12 items-center rounded-xl border border-[#d5e0e5] bg-white px-3 focus-within:border-[#16a5b8]"><input aria-label={ariaLabel} type="number" inputMode={step === "1" ? "numeric" : "decimal"} value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none" /><span className="text-xs text-[#8a99a2]">{suffix}</span></span></label>; }

function HoursMinutesField({ label, optional = false, hours, minutes, onHoursChange, onMinutesChange, maxHours }: { label: string; optional?: boolean; hours: string; minutes: string; onHoursChange: (value: string) => void; onMinutesChange: (value: string) => void; maxHours: number }) { return <fieldset><legend className="mb-2 text-xs font-semibold text-[#526778]">{label}{optional && <span className="font-normal text-[#82929d]"> · optional</span>}</legend><div className="grid grid-cols-2 gap-3"><NumberField label="Hours" ariaLabel={`${label} hours`} suffix="hr" value={hours} onChange={onHoursChange} min={0} max={maxHours} /><NumberField label="Minutes" ariaLabel={`${label} minutes`} suffix="min" value={minutes} onChange={onMinutesChange} min={0} max={59} /></div></fieldset>; }

function MinutesSecondsField({ label, minutes, seconds, onMinutesChange, onSecondsChange, maxMinutes }: { label: string; minutes: string; seconds: string; onMinutesChange: (value: string) => void; onSecondsChange: (value: string) => void; maxMinutes: number }) { return <fieldset><legend className="mb-2 text-xs font-semibold text-[#526778]">{label}</legend><div className="grid grid-cols-2 gap-3"><NumberField label="Minutes" ariaLabel={`${label} minutes`} suffix="min" value={minutes} onChange={onMinutesChange} min={0} max={maxMinutes} /><NumberField label="Seconds" ariaLabel={`${label} seconds`} suffix="sec" value={seconds} onChange={onSecondsChange} min={0} max={59.99} step="0.01" /></div></fieldset>; }

function logTypeForSession(session: SessionKey): LogType { return session === "daily_wellness" ? "wellness" : session === "monday_am_test" ? "monday_test" : session === "friday_am_test" ? "friday_test" : "practice"; }
function optional(value: string) { return value === "" ? null : Number(value); }
function buildPayload(logType: LogType, sessionKey: SessionKey, context: DeviceDateContext, values: Values, athleteId?: string) {
  const base = { logType, sessionKey, activityDate: context.activityDate, athleteId, dateSource: context.dateSource as DateSource, deviceRecordedAt: context.deviceRecordedAt, deviceTimezone: context.deviceTimezone, deviceUtcOffsetMinutes: context.deviceUtcOffsetMinutes };
  if (logType === "wellness") return { ...base, soreness: values.soreness, academicStress: values.academicStress, nutrition: values.nutrition, restingHr: optional(values.restingHr), sleepHours: sleepDurationInHours(values.sleepHours, values.sleepMinutes) };
  if (logType === "monday_test" || logType === "friday_test") return {
    ...base,
    rpe: values.rpe,
    fatigue: values.fatigue,
    pace3x100Seconds: null,
    time25ySeconds: null,
    time25yBreaststrokeSeconds: durationInSeconds(values.time25yBreaststrokeMinutes, values.time25yBreaststrokeSeconds),
    time25yFreestyleSeconds: durationInSeconds(values.time25yFreestyleMinutes, values.time25yFreestyleSeconds),
    time25yFlySeconds: durationInSeconds(values.time25yFlyMinutes, values.time25yFlySeconds),
    time25yBackstrokeSeconds: durationInSeconds(values.time25yBackstrokeMinutes, values.time25yBackstrokeSeconds),
    pace3x100BreaststrokeSeconds: null,
    pace3x100FreestyleSeconds: durationInSeconds(values.pace3x100FreestyleMinutes, values.pace3x100FreestyleSeconds),
    pace3x100FlySeconds: null,
    pace3x100BackstrokeSeconds: null,
    pace3x100ImSeconds: null,
    kickCount: optional(values.kickCount),
    strokeCount: optional(values.strokeCount),
  };
  return {
    ...base,
    rpe: values.rpe,
    fatigue: values.fatigue,
    zone1Minutes: durationInMinutes(values.zone1Hours, values.zone1Minutes),
    zone2Minutes: durationInMinutes(values.zone2Hours, values.zone2Minutes),
    zone3Minutes: durationInMinutes(values.zone3Hours, values.zone3Minutes),
    zone4Minutes: durationInMinutes(values.zone4Hours, values.zone4Minutes),
    zone5Minutes: durationInMinutes(values.zone5Hours, values.zone5Minutes),
  };
}

export function sleepDurationInHours(hours: string, minutes: string) {
  if (hours === "" && minutes === "") return null;
  return (hours === "" ? 0 : Number(hours)) + (minutes === "" ? 0 : Number(minutes)) / 60;
}

export function durationInMinutes(hours: string, minutes: string) {
  if (hours === "" && minutes === "") return null;
  return (hours === "" ? 0 : Number(hours)) * 60 + (minutes === "" ? 0 : Number(minutes));
}

export function durationInSeconds(minutes: string, seconds: string) {
  if (minutes === "" && seconds === "") return null;
  return (minutes === "" ? 0 : Number(minutes)) * 60 + (seconds === "" ? 0 : Number(seconds));
}
