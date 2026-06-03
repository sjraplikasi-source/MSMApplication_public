# Technical Debt

This document records implementation risks observed in the current codebase. It is documentation only.

## High Risk

### 1. Offline backlog creation does not preserve parent-child linkage

- Issue:
  - `BacklogForm.tsx` uses `safeInsert` for the backlog header and its child rows.
  - When offline, `safeInsert` queues the write and does not return a generated backlog ID.
  - Child queue payloads can therefore be created with an undefined `backlog_id`.
- Impact:
  - Offline-created sparepart, tool, and manpower rows may fail to attach to the correct backlog when replayed.
- Risk level:
  - High
- Recommended future direction:
  - Introduce a local ID mapping strategy or transaction-style offline batch model so parent and child records are replayed consistently.

### 2. Notification visibility and read-state logic are inconsistent

- Issue:
  - The badge query in `Layout.tsx` filters notifications by `target_user` and `target_role`.
  - `Notifications.tsx` fetches all notifications and `markAllRead` updates all unread rows without the same scope.
- Impact:
  - Users can potentially view or mark notifications outside their intended role/user scope.
- Risk level:
  - High
- Recommended future direction:
  - Centralize notification query rules and apply the same scope across badge, listing, and update flows.

### 3. Tool return flow does not restore inventory quantity

- Issue:
  - Borrowing decrements `tools.available_quantity`.
  - Returning updates `tool_loans` and uploads a photo but does not increment `tools.available_quantity`.
- Impact:
  - Tool availability can drift downward permanently and stop reflecting real stock.
- Risk level:
  - High
- Recommended future direction:
  - Treat loan creation and return as inventory-affecting transactions with symmetric stock adjustments.

### 4. Mixed data models exist for the same business domains

- Issue:
  - Daily reports use `repair_reports`, but legacy helpers still target `reports`.
  - Mine maintenance uses both `maintenance_records` and `maintenance_executions`.
  - Backlog shutdown needs appear in `backlog_shutdown`, `shutdown_events`, and `backlogs.shutdown_event_id`.
- Impact:
  - Reporting, maintenance history, and future development can fragment across competing tables and code paths.
- Risk level:
  - High
- Recommended future direction:
  - Define canonical tables per domain and formally retire or isolate transitional paths.

## Medium Risk

### 5. Logout is implemented as local token removal only

- Issue:
  - `AuthContext.tsx` intentionally avoids `supabase.auth.signOut()` and clears local storage instead.
- Impact:
  - Browser state resets, but server-side session lifecycle is not managed through the normal Supabase sign-out path.
- Risk level:
  - Medium
- Recommended future direction:
  - Reconcile the local workaround with a session-management strategy that preserves expected Supabase auth behavior.

### 6. Role vocabulary is inconsistent across registration, activation, and navigation

- Issue:
  - Role normalization in `Layout.tsx` supports multiple spellings.
  - `RegisterUser.tsx` offers `SM`.
  - `UserActivation.tsx` shows an `SM` label whose option value is `admin`.
  - Several page checks compare raw role strings directly.
- Impact:
  - Access behavior can become difficult to reason about and easy to misconfigure.
- Risk level:
  - Medium
- Recommended future direction:
  - Standardize a single stored role vocabulary and one authorization helper.

### 7. Supply status values are not normalized across screens

- Issue:
  - Planner review writes stock statuses like `READY`, `ORDER`, `NOSTOCK`.
  - Supply detail uses options `Ready`, `Order`, `Indent`, `Not Ready`.
- Impact:
  - Readiness logic and reporting can become inconsistent or require case-specific handling.
- Risk level:
  - Medium
- Recommended future direction:
  - Normalize the allowed stock-status domain and validate it at one shared boundary.

### 8. Route targets inside mine-maintenance dashboard are inconsistent with the mounted router

- Issue:
  - `MineRouter` is mounted under `/mine-maintenance/*`.
  - `MineMaintenance/Dashboard.tsx` navigates to paths like `/equipment`, `/hour-meter`, `/maintenance-schedule`, and `/maintenance-records`.
- Impact:
  - Buttons can navigate to paths that are outside the active route tree.
- Risk level:
  - Medium
- Recommended future direction:
  - Keep route creation centralized and use module-relative route constants.

### 9. Multi-step writes are not transaction-protected in the client

- Issue:
  - Several workflows perform dependent writes in sequence:
    - report create + manpower links + hour-meter upsert
    - backlog schedule + assignment replacement
    - backlog close + closing row insert + status update
    - tool borrow + inventory decrement
- Impact:
  - Partial success can leave data sets inconsistent after mid-sequence failure.
- Risk level:
  - Medium
- Recommended future direction:
  - Move critical multi-step mutations behind transactional database functions or consolidated service endpoints.

### 10. Notifications and dashboards depend on status strings spread across many pages

- Issue:
  - Backlog and report statuses are compared as string literals across multiple components.
- Impact:
  - Introducing or renaming a status can break filtering, counts, and workflow transitions in several places at once.
- Risk level:
  - Medium
- Recommended future direction:
  - Centralize status constants and document allowed state transitions per domain.

## Low Risk

### 11. Direct Supabase access is spread across many pages and hooks

- Issue:
  - Most data access lives inside UI components instead of a shared domain service layer.
- Impact:
  - Query behavior, validation rules, and error handling are duplicated.
- Risk level:
  - Low
- Recommended future direction:
  - Group data access by domain so workflows and validation are easier to audit.

### 12. Debug logging remains in production-facing screens

- Issue:
  - Multiple pages and contexts log raw operational data to the console.
- Impact:
  - Browser logs become noisy and can expose implementation details during support sessions.
- Risk level:
  - Low
- Recommended future direction:
  - Introduce a controlled logging strategy and remove ad hoc debug statements from user flows.

### 13. Netlify deployment configuration is implicit rather than codified

- Issue:
  - The repository contains `_redirects` and Netlify-oriented build comments, but no committed `netlify.toml`.
- Impact:
  - Build and publish settings must be reproduced in the Netlify UI or CLI link state.
- Risk level:
  - Low
- Recommended future direction:
  - Keep deployment settings documented and, when appropriate, commit them as explicit platform configuration.

### 14. Weekly-check generation logic exists in more than one place

- Issue:
  - Weekly-check generation appears both in `src/services/weeklyCheckScheduler.ts` and `src/components/mine/modals/generateNextWeeklyCheck.ts`.
- Impact:
  - Future logic changes can drift between copies.
- Risk level:
  - Low
- Recommended future direction:
  - Consolidate weekly-check generation behind one reusable module.

### 15. Legacy report edit path remains in the repository

- Issue:
  - `ReportEdit.tsx` and `useReports.ts` still exist and target the legacy `reports` table, while the routed UI uses `ReportForm.tsx` with `repair_reports`.
- Impact:
  - The repository baseline is harder to understand and onboards developers into outdated paths.
- Risk level:
  - Low
- Recommended future direction:
  - Mark legacy paths clearly or separate them from active application flows.
