import { cn } from "@/lib/utils";

export function ScaleInput({ label, value, onChange, lowLabel = "Low", highLabel = "High" }: { label: string; value: number | null; onChange: (value: number) => void; lowLabel?: string; highLabel?: string }) {
  return <fieldset><legend className="text-sm font-semibold text-[#304a5d]">{label}<span className="ml-1 text-[#bf4545]">*</span></legend><div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <button key={number} type="button" aria-pressed={value === number} onClick={() => onChange(number)} className={cn("min-h-11 rounded-xl border text-sm font-bold transition", value === number ? "border-[#0a304a] bg-[#0a304a] text-white" : "border-[#d5e0e5] bg-white text-[#526778] hover:border-[#8da6b1]")}>{number}</button>)}</div><div className="mt-2 flex justify-between text-[.68rem] font-medium text-[#8a99a2]"><span>{lowLabel}</span><span>{highLabel}</span></div></fieldset>;
}
