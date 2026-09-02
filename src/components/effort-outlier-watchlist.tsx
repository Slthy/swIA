"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatChartDate } from "@/components/charts/chart-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import type { EffortOutlier, EffortOutlierMetric } from "@/lib/types";

const visibleOutlierLimit = 8;

interface OutlierWindowControl {
  days: number;
  options: number[];
  preservedFilters: Record<string, string>;
}

export function EffortOutlierWatchlist({ outliers, staffDrilldownQuery, windowControl }: { outliers: EffortOutlier[]; staffDrilldownQuery?: string; windowControl?: OutlierWindowControl }) {
  const [expanded, setExpanded] = useState(false);
  const hasHiddenOutliers = outliers.length > visibleOutlierLimit;
  const visibleOutliers = expanded ? outliers : outliers.slice(0, visibleOutlierLimit);
  return (
    <Card className="overflow-hidden border-[#ead9b8] bg-[#fffdf8]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee3cd] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0d8] text-[#a46218]"><AlertTriangle className="size-4.5" /></span>
          <div>
            <p className="text-[.68rem] font-bold uppercase tracking-[.16em] text-[#8d7448]">Coach view</p>
            <h2 className="mt-1 font-bold tracking-[-.015em] text-[#17384d]">RPE &amp; fatigue watchlist</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[#718491]">Possible outliers are reports at least 2 points from the median of two or more teammates in the same session. Use this as a prompt to check in, not as a diagnosis.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {windowControl && <form method="get" className="flex items-center gap-2">
            {Object.entries(windowControl.preservedFilters).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <label className="sr-only" htmlFor="outlier-days">Watchlist timespan</label>
            <select id="outlier-days" name="outlierDays" defaultValue={windowControl.days} className="min-h-9 rounded-lg border border-[#ddcfb1] bg-white px-2.5 text-xs font-semibold text-[#304a5d] outline-none focus:border-[#16a5b8]">
              {windowControl.options.map((days) => <option key={days} value={days}>Last {days} days</option>)}
            </select>
            <button className="min-h-9 rounded-lg bg-[#0a304a] px-3 text-xs font-semibold text-white">Update</button>
          </form>}
          <span className="rounded-full bg-[#fff0d8] px-3 py-1.5 text-xs font-bold text-[#8b551b]">{outliers.length} possible outlier{outliers.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {!visibleOutliers.length ? (
        <div className="px-5 py-6 text-sm text-[#607181] sm:px-6">No RPE or fatigue reports stand apart from the selected team trend{windowControl ? ` in the last ${windowControl.days} days` : " in this period"}. Sessions need at least three athlete reports for comparison.</div>
      ) : (
        <div className="divide-y divide-[#eee8dc]">
          {visibleOutliers.map((outlier) => (
            <div key={`${outlier.date}:${outlier.sessionKey}:${outlier.athleteId}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(150px,1fr)_minmax(260px,2fr)] sm:items-center sm:px-6">
              <div>
                <Link href={`/staff?subject=${outlier.athleteId}${staffDrilldownQuery ? `&${staffDrilldownQuery}` : ""}`} className="inline-flex items-center gap-1 font-bold text-[#0a6f7e] hover:underline">
                  {outlier.athleteName}<ArrowUpRight className="size-3.5" />
                </Link>
                <p className="mt-1 text-xs text-[#718491]">{formatChartDate(outlier.date)} · {SESSION_LABELS[outlier.sessionKey]}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {outlier.rpe && <MetricPill label="RPE" metric={outlier.rpe} />}
                {outlier.fatigue && <MetricPill label="Fatigue" metric={outlier.fatigue} />}
              </div>
            </div>
          ))}
          {hasHiddenOutliers && <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
            <p className="text-xs text-[#718491]">{expanded ? `Showing all ${outliers.length} signals in this period.` : `Showing the ${visibleOutlierLimit} most recent signals. ${outliers.length - visibleOutlierLimit} more are in this period.`}</p>
            <Button type="button" variant="secondary" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="min-h-9 rounded-lg px-3 text-xs">
              {expanded ? "Show less" : `Show all ${outliers.length}`}
            </Button>
          </div>}
        </div>
      )}
    </Card>
  );
}

function MetricPill({ label, metric }: { label: string; metric: EffortOutlierMetric }) {
  const direction = metric.difference > 0 ? "above" : "below";
  return <span className="rounded-xl border border-[#ead9b8] bg-white px-3 py-2 text-xs text-[#607181]"><strong className="text-[#17384d]">{label} {formatValue(metric.athleteValue)}</strong><span className="mx-1.5 text-[#b4a78e]">·</span>{formatValue(Math.abs(metric.difference))} {direction} median {formatValue(metric.peerMedian)} <span className="text-[#8a969e]">({metric.peerCount} peers)</span></span>;
}

function formatValue(value: number) {
  return Number(value.toFixed(1));
}
