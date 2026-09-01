import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/logo";

export default function OfflinePage() {
  return (
    <main className="safe-screen grid place-items-center">
      <div className="surface-card max-w-md p-8 text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <WifiOff className="mx-auto mb-4 size-10 text-[#8d7448]" />
        <h1 className="text-2xl font-bold text-[#0a304a]">Connection required</h1>
        <p className="mt-3 text-sm leading-6 text-[#607181]">Logs and protected dashboard data are never cached. Reconnect to continue securely.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#0a304a] px-5 text-sm font-semibold text-white">Try again</Link>
      </div>
    </main>
  );
}
