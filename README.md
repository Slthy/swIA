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

- The device-local date is primary; manual date selection is a fallback/backfill path.
- Session options are derived from the activity date and validated again in Postgres.
- Missing metrics remain null and are excluded from averages.
- Wellness uses one shared 1–10 chart with independent toggles.
- HR zones use independently toggleable segments in each stacked daily column.
- Daily load averages sessions within each athlete-day before team aggregation.
