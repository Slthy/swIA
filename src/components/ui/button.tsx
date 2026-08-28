import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#0a304a] text-white shadow-sm hover:bg-[#124866]",
        variant === "secondary" && "border border-[#cdd9df] bg-white text-[#17384d] hover:border-[#9fb3bd] hover:bg-[#f8fafb]",
        variant === "ghost" && "text-[#526778] hover:bg-[#e9f0f2]",
        variant === "danger" && "bg-[#bf4545] text-white hover:bg-[#9f3535]",
        className,
      )}
      {...props}
    />
  );
}
