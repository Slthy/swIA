# GW SwimTrack data-analysis rules

Last reviewed: 2026-08-31

This document is the authoritative, human-readable record of every statistical rule used by GW SwimTrack. The canonical tunable values live in `.env.analytics`; this file explains how and why they are used. Analytics are coaching signals, not medical diagnoses. Every analytics change must update this document, the rule manifest in `src/lib/analytics-criteria.ts`, and automated tests.

## Shared rules

### DA-MISSING-001 — Missing measurements

Null or absent measurements are excluded from calculations and remain gaps in charts. They are never converted to zero. A result with no valid observations is reported as unavailable.

## Wellness, workload, and recovery

### DA-WELLNESS-001 — Daily wellness

Morning soreness, academic/life stress, nutrition/hydration, resting heart rate, and sleep are arithmetic means of the available athlete entries for each activity date and selected dashboard subject. Overall summary values are arithmetic means of their available observations.

### DA-LOAD-001 — Daily load

Session RPE is first averaged within each athlete and activity date. The dashboard daily-load point is then the arithmetic mean of those athlete-day values, preventing athletes with more sessions from receiving extra weight.

### DA-ZONES-001 — Heart-rate zones

Zone minutes are summed across an athlete’s sessions for each date. The team point is the arithmetic mean of those athlete-day totals. Each zone remains independently toggleable.

### DA-EFFORT-001 — Session effort

Session RPE and post-session fatigue are grouped by activity date and session key, then averaged over available athlete observations. RPE and fatigue share the 1–10 scale and may be plotted together.

## 25-yard test progression

### DA-25Y-001 — Valid stroke result

A new 25y test contains at most one assigned stroke: breaststroke, freestyle, fly, or backstroke. Legacy unspecified-stroke times remain visible in Daily results but are excluded from progression and recovery analysis. Monday and Friday may use different strokes.

### DA-25Y-002 — Comparable change

For each athlete, weekday, and assigned stroke, the current time is compared with the previous available result for that same athlete, weekday, and stroke. `change seconds = current seconds − previous comparable seconds`. Negative values are faster. The previous comparison date is always retained so skipped weeks are not presented as consecutive tests. Comparison history may precede the selected display window, while only tests inside the selected window are plotted. Monday–Friday change is calculated only when both tests in the same ISO week used the same stroke.

### DA-25Y-003 — Stable bounds and colors

The stable lower and upper bounds come from `ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS` and `ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS`. A change below the lower bound is faster/green. A change above the upper bound is slower/red. Inclusive values between the two bounds are stable/neutral. The current defaults are −0.10 and +0.10 seconds.

### DA-25Y-004 — Possible recovery mismatch

An athlete-week is labeled **Possible recovery mismatch** only when the selected stroke has both current Monday and Friday tests, both weekdays have a previous comparable result, Monday change is below the configured lower bound, and Friday change is above the configured upper bound. This pattern is contextual evidence for coach review and does not establish that training load caused the change.

Team raw-time and count points are medians, as required by `ANALYTICS_25Y_TEAM_AGGREGATION`. Team delta points are medians of athlete-level comparable changes rather than differences between two team medians. The UI reports the flagged and comparable athlete counts instead of diagnosing the team.

### DA-CONTEXT-001 — Weekly load and recovery context

Practice context uses non-test practice sessions from Monday through Thursday of the ISO week. Practice RPE and post-session fatigue are arithmetic means of available values. Recovery context uses Monday and Friday daily-wellness entries: Friday sleep and soreness are reported directly, and changes are `Friday − Monday` when both values exist. Missing context remains unavailable and never prevents a valid 25y comparison.

Stroke-count and kick-count overlays use the recorded values associated with the selected 25y test. Individual views show raw counts; team views show medians.

## 3×100 freestyle

### DA-3X100-001 — Average pace

The 3×100 test is freestyle only. Each entry stores the athlete’s average seconds per 100. Dashboard points group entries by activity date and Monday/Friday test day and use the arithmetic mean for the selected subject. Legacy generic 3×100 pace is used only when a freestyle-specific value is absent.

## Configuration and reporting

- `ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS` selects the staff dashboard default.
- `ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS` defines the preset week windows; All time and Custom dates are always available.
- Active stable bounds must be shown in the 25y explanation and tooltip.
- Configuration changes require validation, automated tests, and a new deployment.

## Change log

- 2026-08-31: Established the analytics rule registry, configurable 25y stable bounds, Monday/Friday like-stroke progression, recovery-mismatch signal, team medians, and weekly context definitions.
