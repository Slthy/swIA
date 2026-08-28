import { cn } from "@/lib/utils";

export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="GW SwimTrack">
      <span className={cn("grid size-10 place-items-center rounded-xl", inverse ? "bg-white/10" : "bg-[#0a304a]")}> 
        <svg viewBox="0 0 40 40" className="size-7" aria-hidden="true">
          <path d="M4 13c5-3.5 9-3.5 14 0s9 3.5 14 0c2-1.4 3.5-1.7 5-1.2" fill="none" stroke="#b49a69" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M3 21c5.5-3.6 9.5-3.6 15 0s9.5 3.6 15 0c1.7-1.1 3-1.4 4.2-1.2" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M4 29c5-3.5 9-3.5 14 0s9 3.5 14 0c2-1.4 3.5-1.7 5-1.2" fill="none" stroke="#24b7c7" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className={cn("text-[1.05rem] font-bold tracking-[-0.02em]", inverse ? "text-white" : "text-[#0a304a]")}>
          GW <span className={inverse ? "text-[#ddcfb1]" : "text-[#8d7448]"}>SwimTrack</span>
        </span>
      )}
    </div>
  );
}
