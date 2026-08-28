import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function ChartCard({ title, eyebrow, controls, children, className = "" }: { title: string; eyebrow?: string; controls?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`min-w-0 overflow-hidden p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>{eyebrow && <p className="mb-1 text-[.68rem] font-bold uppercase tracking-[.16em] text-[#8d7448]">{eyebrow}</p>}<h2 className="font-bold tracking-[-.015em] text-[#17384d]">{title}</h2></div>
        {controls}
      </div>
      {children}
    </Card>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-[#d5e0e5] bg-[#f9fbfb] px-6 text-center text-sm text-[#718491]">{message}</div>;
}
