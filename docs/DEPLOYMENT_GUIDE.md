# Deployment Guide

This guide documents the deployment behavior that is observable from the current repository. It does not assume infrastructure that is not present in code.

## Deployment Model

The application is currently structured as:

- a Vite-built React SPA
- intended for static hosting
- integrated with Supabase as its backend platform
- PWA-enabled through `vite-plugin-pwa`
- packaged for Android through Capacitor using the same `dist` output

There is no repository-owned server runtime, API layer, or Netlify Functions layer.

## Local Development

### Prerequisites

- Node.js and npm
- Access to the target Supabase project

### Install dependencies

The repository already contains `node_modules`, but the standard workflow implied by `package.json` is:

```bash
npm install
```

### Start the Vite dev server

```bash
npm run dev
```

### Available scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Environment Variables

The codebase reads the following Vite environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are consumed by:

- `src/lib/supabase.ts`
- `src/lib/supabaseClient.ts`

Documentation note:

- The repository workspace currently contains a `.env` file.
- This guide intentionally documents variable names only, not secret values.

## Build Process

The current build command from `package.json` is:

```bash
npm run build
```

That expands to:

```bash
node generate-version.js && tsc && vite build
```

### What the build does

1. `generate-version.js`
   - writes `public/version.json`
   - stores a timestamp-style build version and build date
2. `tsc`
   - performs TypeScript compilation checks
3. `vite build`
   - outputs the production SPA into `dist/`

## PWA Configuration

PWA behavior is configured in `vite.config.ts` and activated in `src/main.tsx`.

### Current PWA characteristics

- plugin: `vite-plugin-pwa`
- registration mode: `autoUpdate`
- `registerSW({ immediate: true })`
- manifest includes:
  - app name
  - short name
  - theme color
  - background color
  - standalone display mode
  - portrait orientation
  - icons from `public/icons`
- Workbox cache file size limit is increased to 10 MB

### Runtime update behavior

- `AutoUpdateHandler.tsx` polls `/version.json` every 60 seconds
- when the version changes, the UI shows an update prompt
- refreshing the page loads the new version

## SPA Routing

SPA routing for static hosting is currently handled by:

- `public/_redirects`

Current rule:

```text
/* /index.html 200
```

This is compatible with Netlify-style static SPA hosting.

## Netlify Deployment

## What is present in the repo

- `public/_redirects` for SPA fallback
- `vite.config.ts` comments referencing Netlify build handling
- `dist/` as the publish artifact

## What is not present in the repo

- no committed `netlify.toml`
- no Netlify Functions
- no Edge Functions
- no explicit Netlify plugin configuration

## Actual deployment settings implied by the repo

If this project is deployed to Netlify, the settings implied by the current codebase are:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Because `netlify.toml` is not present, these settings must exist in:

- Netlify site UI, or
- existing Netlify CLI/site link configuration

## Supabase Requirements

The deployed app expects the target Supabase project to provide:

- Auth enabled for browser sign-in/sign-up
- database tables used by the application, including:
  - `users`
  - `repair_reports`
  - `repair_reports_manpower`
  - `backlogs`
  - `backlog_spareparts`
  - `backlog_tools`
  - `backlog_manpower`
  - `backlog_closings`
  - `backlog_assignments`
  - `shutdown_events`
  - `notifications`
  - `equipment`
  - `components`
  - `hour_meter_readings`
  - `maintenance_schedules`
  - `maintenance_executions`
  - `weekly_check_schedule`
  - `tools`
  - `tool_loans`
  - `employees`
  - `energy_meter_readings`
  - and supporting master tables
- storage buckets:
  - `sparepart-images`
  - `tool-returns`
- RPC functions:
  - `generate_backlog_registration_code`
  - `calculate_average_hours_per_day`
  - `get_waiting_for_parts_count`
- Realtime access for the `notifications` table channel

## Capacitor / Android Packaging

The repository contains an Android wrapper project under `android/`.

### Current packaging assumptions

- Capacitor app ID: `com.msm.application`
- App name: `MSM Application`
- Web build directory: `dist`
- Android manifest includes `INTERNET` permission

### Practical packaging flow implied by the repo

1. Build the web assets into `dist`
2. Use Capacitor tooling to sync/copy web assets into the Android project
3. Build the Android app through the `android/` project

This repository does not define npm scripts for Capacitor sync/build, so those steps depend on developer or CI tooling outside `package.json`.

## Production Checklist

- Confirm `VITE_SUPABASE_URL` points to the intended Supabase project
- Confirm `VITE_SUPABASE_ANON_KEY` matches that project
- Confirm required RPCs exist
- Confirm storage buckets exist
- Confirm SPA redirect handling is active
- Confirm `npm run build` publishes `dist`
- Confirm `version.json` is generated during build
- Confirm Supabase table permissions and auth policies match browser-side access patterns

## Observed Operational Notes

- The app is highly dependent on direct browser-to-Supabase access.
- A deployment problem in Supabase configuration will surface immediately in the UI because there is no intermediary backend in this repository.
- Offline queue logic is present, but only parts of the backlog flow actively use it.
