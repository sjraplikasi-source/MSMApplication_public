# Changelog Baseline

This file captures the current functional baseline of the repository as of the present code state. It is intended to serve as the starting point for future changelog entries.

## Existing Modules

- Authentication and role-based access
- Daily repair / R&M reporting
- Report validation
- Dashboard and Pareto analysis
- Backlog management
- Supply management
- Scheduling and work calendar
- Shutdown planner
- Notifications
- Mine maintenance
- Tool room
- Operational energy monitoring
- PWA / offline / update infrastructure
- Android packaging via Capacitor

## Existing Features

### Authentication And Access

- Supabase email/password sign-in
- Supabase sign-up-based registration
- user profile hydration from `users`
- role-aware sidebar visibility
- protected routes

### Daily Reports

- create repair report
- edit repair report
- attach manpower via join table
- validate hour meter before save
- approve or reject report
- dashboard KPIs
- Pareto charts by equipment and problem type
- export reports to Excel

### Backlog

- create backlog with priority
- duplicate-similarity warning by unit/problem
- optional sparepart, tool, manpower, and shutdown requirements
- backlog validation
- planner review with structured resource updates
- backlog dashboard
- backlog list with filters and Excel export
- backlog detail with close workflow
- backlog edit flow

### Supply

- supply queue view
- sparepart readiness update
- estimated ready-date tracking
- supply Excel export
- automatic transition to scheduling-ready statuses when parts become ready

### Scheduling And Shutdown

- schedule regular backlog items
- schedule shutdown-dependent backlog items
- assign mechanics to scheduled work
- calendar-based work schedule view
- create/edit/delete shutdown events
- shutdown schedule export

### Notifications

- insert workflow notifications
- realtime unread badge refresh
- notifications list and read acknowledgement

### Mine Maintenance

- equipment CRUD
- component CRUD
- hour-meter reading history
- automatic average-hours-per-day RPC usage
- weekly check schedule management
- maintenance schedule list
- maintenance execution records
- maintenance planning table and Excel export

### Tool Room

- tool inventory list and CRUD interactions
- tool borrowing
- QR/UUID-based tool scan in borrow flow
- tool return with photo evidence upload
- tool-room dashboard
- tool-room reporting and Excel export

### Operational Energy

- kWh input for PLN GI
- kWh input for PLN GH
- genset dual-input capture
- yearly monitoring charts for consumption and efficiency

### PWA / Offline / Update

- service-worker registration
- generated web manifest
- app version polling through `version.json`
- update prompt UI
- IndexedDB offline queue primitives
- periodic queue sync when online

## Existing Integrations

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Supabase RPC
- Netlify-style SPA hosting behavior through `_redirects`
- Capacitor Android wrapper

## Existing Supabase RPC Dependencies

- `generate_backlog_registration_code`
- `calculate_average_hours_per_day`
- `get_waiting_for_parts_count`

## Existing Storage Buckets

- `sparepart-images`
- `tool-returns`

## Existing Infrastructure

- Vite + React + TypeScript SPA
- Tailwind CSS
- PWA via `vite-plugin-pwa`
- `dist/` production build output
- `public/version.json` generated at build time
- `public/_redirects` SPA routing fallback
- Android project under `android/`

## Existing Cross-Cutting Constraints

- Browser clients call Supabase directly
- No custom backend API is present in the repository
- Role-based visibility is enforced in the frontend
- A number of workflows rely on string-based status transitions in the UI
- Some legacy/transitional code paths remain alongside active modules

## Baseline Notes For Future Changelogs

When recording future changes, compare against this baseline in these areas first:

- report table usage (`repair_reports` vs legacy `reports`)
- backlog state machine
- supply readiness logic
- scheduling and assignment behavior
- mine-maintenance table strategy
- tool-room inventory consistency
- notification scoping behavior
- deployment codification (`netlify.toml`, scripts, CI, Capacitor flow)
