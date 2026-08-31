# GW SwimTrack

Installable, role-aware wellness and performance tracking for GW Swimming. Athletes get a mobile-first daily logging experience; coaches and administrators get desktop-oriented team analytics.

## Implementation checklist

- [x] Installable iPhone/Android PWA shell, icons, manifest, and install guidance
- [x] Athlete, coach, and administrator role flows
- [x] Six-digit athlete PINs and alphanumeric staff passwords
- [x] Device-local date defaults with manual backfill fallback
- [x] Weekday-aware form choices and matching database validation
- [x] Wellness, practice, lift, swim-test, fatigue, and HR-zone logging
- [x] Toggleable shared wellness chart and toggleable stacked HR-zone chart
- [x] Individual, team, sex-category, custom-group, and date-range analytics
- [x] Row-level access policies, soft deletion, account management, and audit events
- [x] Automated type, validation, analytics, chart-control, and production-build checks
- [ ] Apply the Supabase migration to the production project
- [ ] Provision the first administrator and athlete roster
- [ ] Add production environment variables in Vercel and deploy

## Local development

```bash
npm install
npm run dev
```

Without environment variables the app opens in read-only preview mode with generated, non-roster data. Copy `.env.example` to `.env.local` and add Supabase credentials to enable authentication and persistence.

The committed `.env.analytics` file is the canonical, non-secret source for tunable analysis criteria. It currently defines the stable 25y change bounds, default and allowed trend windows, and team aggregation method. The values are embedded into the server bundle during `next build` so Vercel functions receive the same criteria. Changing the file requires validation and a new deployment.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_initial.sql` in the SQL editor or through the Supabase CLI.
3. Add the project URL, anon key, service-role key, and a long login hash secret to `.env.local` and Vercel.
4. Provision the first admin:

```bash
npm run provision -- --admin-username=coach.admin --admin-name="Coach Admin" --admin-password=Secure1234
```

5. Provision the 39-athlete roster:

```bash
npm run provision -- --roster
```

The roster command creates a mode-`0600`, git-ignored credential CSV. Distribute it securely and remove it when no longer needed.

## Training-group demo data

After the roster and first staff account exist, preview the deterministic seed plan:

```bash
npm run seed:training -- --dry-run
```

Then create Sprint, Mid-D, and Distance groups, create five clearly labeled mock athlete accounts per group, and insert the latest 30 days of date-valid logs:

```bash
npm run seed:training
```

Use `--end=YYYY-MM-DD` to choose a fixed final date. Newly created mock accounts are written to a mode-`0600`, git-ignored credential CSV. Re-running the command resets only these three group memberships and preserves logs that already exist for a mock athlete/date/session.

Preview or remove all athletes created by the training-data seed:

```bash
npm run delete:mock-athletes
npm run delete:mock-athletes -- --execute
```

The execute command writes a mode-`0600` JSON backup to `/tmp` before permanently deleting the mock entries, memberships, profiles, and login accounts.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Deployment

Import the repository into Vercel, select Node.js 22, and configure the four variables from `.env.example`. The app includes a manifest, standalone metadata, install guidance, static-asset service worker, and an offline connection notice. Authenticated pages, API responses, and submissions are always network-only.

## Data rules

The complete statistical and data-analysis contract is maintained in [`docs/data-analysis-rules.md`](docs/data-analysis-rules.md). Every analytics behavior or threshold change must update that file, the criteria manifest, and the related automated tests.

- The device-local date is primary; manual date selection is a fallback/backfill path.
- Session options are derived from the activity date and validated again in Postgres.
- Missing metrics remain null and are excluded from averages.
- Wellness uses one shared 1–10 chart with independent toggles.
- HR zones use independently toggleable segments in each stacked daily column.
- Daily load averages sessions within each athlete-day before team aggregation.
- Monday and Friday 25y changes compare the same athlete, weekday, and assigned stroke with the previous available like-for-like result in the selected window.
- Team 25y lines and changes use medians; negative time changes are improvements, positive changes are regressions, and the configured stable band is neutral.
