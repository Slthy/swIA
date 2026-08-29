"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Clock3, Info } from "lucide-react";
import { saveLog } from "@/app/actions/logs";
import { ScaleInput } from "@/components/scale-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import { getDeviceDateContext, sessionsForDate, type DeviceDateContext } from "@/lib/dates";
import type { DateSource, LogType, SessionKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Values {
  soreness: number | null; academicStress: number | null; nutrition: number | null;
  restingHr: string; sleepHours: string; rpe: number | null; fatigue: number | null;
  time25yBreaststrokeSeconds: string; time25yFreestyleSeconds: string; time25yFlySeconds: string; time25yBackstrokeSeconds: string;
  pace3x100BreaststrokeSeconds: string; pace3x100FreestyleSeconds: string; pace3x100FlySeconds: string; pace3x100BackstrokeSeconds: string; pace3x100ImSeconds: string;
  kickCount: string; strokeCount: string;
  zone1Minutes: string; zone2Minutes: string; zone3Minutes: string; zone4Minutes: string; zone5Minutes: string;
}

const initialValues: Values = {
  soreness: null, academicStress: null, nutrition: null, restingHr: "", sleepHours: "", rpe: null, fatigue: null,
  time25yBreaststrokeSeconds: "", time25yFreestyleSeconds: "", time25yFlySeconds: "", time25yBackstrokeSeconds: "",
  pace3x100BreaststrokeSeconds: "", pace3x100FreestyleSeconds: "", pace3x100FlySeconds: "", pace3x100BackstrokeSeconds: "", pace3x100ImSeconds: "",
  kickCount: "", strokeCount: "", zone1Minutes: "", zone2Minutes: "", zone3Minutes: "", zone4Minutes: "", zone5Minutes: "",
};

export function LogForm({ initialSession, athleteId, preview = false }: { initialSession?: SessionKey; athleteId?: string; preview?: boolean }) {
  const [context, setContext] = useState<DeviceDateContext | null>(null);
  const [manualDate, setManualDate] = useState(false);
  const [sessionKey, setSessionKey] = useState<SessionKey>("daily_wellness");
  const [values, setValues] = useState(initialValues);
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
        {(logType === "monday_test" || logType === "friday_test") && <TestFields values={values} set={set} />}
        {logType === "practice" && <PracticeFields values={values} set={set} />}
        {message && <div role="status" className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm", message.type === "success" ? "bg-emerald-50 text-emerald-750" : "bg-red-50 text-red-700")}>{message.type === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}<span>{message.text}</span></div>}
        <Button type="button" disabled={pending} onClick={submit} className="w-full sm:w-auto">{pending ? "Saving…" : "Save entry"}</Button>
      </div>
    </Card>
    <aside className="space-y-4"><Card className="p-5"><p className="text-sm font-bold text-[#17384d]">Date-aware logging</p><p className="mt-2 text-sm leading-6 text-[#607181]">Sessions come from your device’s local day. Choosing a fallback date immediately updates the available options.</p></Card><Card className="p-5"><p className="text-sm font-bold text-[#17384d]">Optional means optional</p><p className="mt-2 text-sm leading-6 text-[#607181]">Leave a measurement blank if you do not have it. Missing data stays empty and is never plotted as zero.</p></Card></aside>
  </div>;
}

function WellnessFields({ values, set }: FieldProps) { return <div className="space-y-7"><ScaleInput label="Morning soreness" value={values.soreness} onChange={(value) => set("soreness", value)} lowLabel="1 · Fresh" highLabel="10 · Sore" /><ScaleInput label="Academic & life stress" value={values.academicStress} onChange={(value) => set("academicStress", value)} /><ScaleInput label="Nutrition & hydration" value={values.nutrition} onChange={(value) => set("nutrition", value)} /><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Resting heart rate" suffix="bpm" value={values.restingHr} onChange={(value) => set("restingHr", value)} min={20} max={250} /><NumberField label="Sleep duration" suffix="hours" value={values.sleepHours} onChange={(value) => set("sleepHours", value)} min={0} max={24} step="0.25" /></div></div>; }
function TestFields({ values, set }: FieldProps) {
  return <div className="space-y-7">
    <ScaleInput label="Session RPE" value={values.rpe} onChange={(value) => set("rpe", value)} />
    <ScaleInput label="Post-session fatigue" value={values.fatigue} onChange={(value) => set("fatigue", value)} />
    <div>
      <p className="text-sm font-bold text-[#304a5d]">25y time by stroke <span className="font-normal text-[#82929d]">· seconds</span></p>
      <p className="mt-1 text-xs text-[#82929d]">Enter only the strokes tested in this session.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Breaststroke" suffix="sec" value={values.time25yBreaststrokeSeconds} onChange={(value) => set("time25yBreaststrokeSeconds", value)} step="0.01" />
        <NumberField label="Freestyle" suffix="sec" value={values.time25yFreestyleSeconds} onChange={(value) => set("time25yFreestyleSeconds", value)} step="0.01" />
        <NumberField label="Fly" suffix="sec" value={values.time25yFlySeconds} onChange={(value) => set("time25yFlySeconds", value)} step="0.01" />
        <NumberField label="Backstroke" suffix="sec" value={values.time25yBackstrokeSeconds} onChange={(value) => set("time25yBackstrokeSeconds", value)} step="0.01" />
      </div>
    </div>
    <div>
      <p className="text-sm font-bold text-[#304a5d]">3×100 average pace by stroke <span className="font-normal text-[#82929d]">· seconds</span></p>
      <p className="mt-1 text-xs text-[#82929d]">Use the average time per 100 for each tested stroke.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NumberField label="Breaststroke" suffix="sec" value={values.pace3x100BreaststrokeSeconds} onChange={(value) => set("pace3x100BreaststrokeSeconds", value)} step="0.01" />
        <NumberField label="Freestyle" suffix="sec" value={values.pace3x100FreestyleSeconds} onChange={(value) => set("pace3x100FreestyleSeconds", value)} step="0.01" />
        <NumberField label="Fly" suffix="sec" value={values.pace3x100FlySeconds} onChange={(value) => set("pace3x100FlySeconds", value)} step="0.01" />
        <NumberField label="Backstroke" suffix="sec" value={values.pace3x100BackstrokeSeconds} onChange={(value) => set("pace3x100BackstrokeSeconds", value)} step="0.01" />
        <NumberField label="IM" suffix="sec" value={values.pace3x100ImSeconds} onChange={(value) => set("pace3x100ImSeconds", value)} step="0.01" />
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><NumberField label="Kick count" value={values.kickCount} onChange={(value) => set("kickCount", value)} /><NumberField label="Stroke count" value={values.strokeCount} onChange={(value) => set("strokeCount", value)} /></div>
  </div>;
}
function PracticeFields({ values, set }: FieldProps) { return <div className="space-y-7"><ScaleInput label="Session RPE" value={values.rpe} onChange={(value) => set("rpe", value)} /><ScaleInput label="Post-session fatigue" value={values.fatigue} onChange={(value) => set("fatigue", value)} /><div><p className="mb-3 text-sm font-semibold text-[#304a5d]">Heart-rate zone minutes <span className="font-normal text-[#82929d]">· optional</span></p><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[1,2,3,4,5].map((zone) => <NumberField key={zone} label={`Zone ${zone}`} suffix="min" value={values[`zone${zone}Minutes` as keyof Values] as string} onChange={(value) => set(`zone${zone}Minutes` as keyof Values, value)} min={0} max={360} />)}</div></div></div>; }

interface FieldProps { values: Values; set: (field: keyof Values, value: string | number) => void }
function NumberField({ label, suffix, value, onChange, min = 0, max, step = "1" }: { label: string; suffix?: string; value: string; onChange: (value: string) => void; min?: number; max?: number; step?: string }) { return <label><span className="mb-2 block text-xs font-semibold text-[#526778]">{label}</span><span className="flex min-h-12 items-center rounded-xl border border-[#d5e0e5] bg-white px-3 focus-within:border-[#16a5b8]"><input type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none" /><span className="text-xs text-[#8a99a2]">{suffix}</span></span></label>; }

function logTypeForSession(session: SessionKey): LogType { return session === "daily_wellness" ? "wellness" : session === "monday_am_test" ? "monday_test" : session === "friday_am_test" ? "friday_test" : "practice"; }
function optional(value: string) { return value === "" ? null : Number(value); }
function buildPayload(logType: LogType, sessionKey: SessionKey, context: DeviceDateContext, values: Values, athleteId?: string) {
  const base = { logType, sessionKey, activityDate: context.activityDate, athleteId, dateSource: context.dateSource as DateSource, deviceRecordedAt: context.deviceRecordedAt, deviceTimezone: context.deviceTimezone, deviceUtcOffsetMinutes: context.deviceUtcOffsetMinutes };
  if (logType === "wellness") return { ...base, soreness: values.soreness, academicStress: values.academicStress, nutrition: values.nutrition, restingHr: optional(values.restingHr), sleepHours: optional(values.sleepHours) };
  if (logType === "monday_test" || logType === "friday_test") return {
    ...base,
    rpe: values.rpe,
    fatigue: values.fatigue,
    pace3x100Seconds: null,
    time25ySeconds: null,
    time25yBreaststrokeSeconds: optional(values.time25yBreaststrokeSeconds),
    time25yFreestyleSeconds: optional(values.time25yFreestyleSeconds),
    time25yFlySeconds: optional(values.time25yFlySeconds),
    time25yBackstrokeSeconds: optional(values.time25yBackstrokeSeconds),
    pace3x100BreaststrokeSeconds: optional(values.pace3x100BreaststrokeSeconds),
    pace3x100FreestyleSeconds: optional(values.pace3x100FreestyleSeconds),
    pace3x100FlySeconds: optional(values.pace3x100FlySeconds),
    pace3x100BackstrokeSeconds: optional(values.pace3x100BackstrokeSeconds),
    pace3x100ImSeconds: optional(values.pace3x100ImSeconds),
    kickCount: optional(values.kickCount),
    strokeCount: optional(values.strokeCount),
  };
  return { ...base, rpe: values.rpe, fatigue: values.fatigue, zone1Minutes: optional(values.zone1Minutes), zone2Minutes: optional(values.zone2Minutes), zone3Minutes: optional(values.zone3Minutes), zone4Minutes: optional(values.zone4Minutes), zone5Minutes: optional(values.zone5Minutes) };
}
