# Modules

This document groups the current implementation into functional modules based on routes, pages, components, and Supabase usage found in the codebase.

## 1. Authentication And User Access

- Module name: Authentication And User Access
- Purpose: Login, session bootstrap, registration, role assignment, route protection, and role-based menu visibility.
- Main pages:
  - `/login`
  - `/register`
  - `/aktivasi`
  - `/konfigurasi`
- Main components:
  - `src/context/AuthContext.tsx`
  - `src/components/Layout.tsx`
  - `src/pages/Login.tsx`
  - `src/pages/RegisterUser.tsx`
  - `src/pages/UserActivation.tsx`
  - `src/pages/Configuration.tsx`
- Main database tables:
  - `users`
  - master tables managed through configuration:
    - `action`
    - `activities`
    - `activity_type`
    - `area`
    - `diagnosis`
    - `equipment`
    - `failure`
    - `finding`
    - `instruction`
    - `manpower`
    - `problems`
    - `reason`
    - `sub_component`
- Related workflows:
  - User login
  - User registration
  - User role update
  - Master-data maintenance

## 2. Daily Repair And Maintenance Reporting

- Module name: Daily Repair And Maintenance Reporting
- Purpose: Capture daily breakdown/repair activity, validate reports, analyze performance, and export datasets.
- Main pages:
  - `/dashboard`
  - `/reports`
  - `/reports/new`
  - `/reports/edit/:id`
  - `/reports/:id`
  - `/validasi`
  - `/pareto`
  - `/download`
- Main components:
  - `src/pages/ReportForm.tsx`
  - `src/pages/ReportList.tsx`
  - `src/pages/ReportDetail.tsx`
  - `src/pages/ReportValidation.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/BreakdownParetoPage.tsx`
  - `src/pages/Download.tsx`
  - hooks:
    - `src/hooks/useReportData.ts`
    - `src/hooks/useReportById.ts`
- Main database tables:
  - `repair_reports`
  - `repair_reports_manpower`
  - `equipment`
  - `users`
  - `manpower`
  - `problems`
  - `failure`
  - `diagnosis`
  - `reason`
  - `finding`
  - `area`
  - `action`
  - `instruction`
  - `sub_component`
  - `activities`
  - `activity_type`
  - `hour_meter_readings`
- Related workflows:
  - Report creation
  - Report edit
  - Report approval / rejection
  - Report export
  - Pareto analysis

## 3. Backlog Management

- Module name: Backlog Management
- Purpose: Record maintenance backlog items and move them through validation, planner review, scheduling readiness, and closure.
- Main pages:
  - `/backlog/dashboard`
  - `/backlog/input`
  - `/backlog/validasi`
  - `/backlog/review`
  - `/backlog/review/:id`
  - `/backlog/list`
  - `/backlog/detail/:id`
  - `/backlog/edit/:id`
- Main components:
  - `src/pages/Backlog/BacklogForm.tsx`
  - `src/pages/Backlog/BacklogValidation.tsx`
  - `src/pages/Backlog/BacklogReview.tsx`
  - `src/pages/Backlog/PlannerReviewDetail.tsx`
  - `src/pages/Backlog/BacklogList.tsx`
  - `src/pages/Backlog/BacklogDetail.tsx`
  - `src/pages/Backlog/EditBacklog.tsx`
  - `src/pages/Backlog/BacklogDashboard.tsx`
  - `src/components/BacklogTable.tsx`
  - `src/components/SupplyStatusBadge.tsx`
- Main database tables:
  - `backlogs`
  - `backlog_spareparts`
  - `backlog_tools`
  - `backlog_manpower`
  - `backlog_shutdown`
  - `backlog_closings`
  - `equipment`
  - `manpower`
  - `users`
  - `notifications`
- Related workflows:
  - Backlog creation
  - Backlog validation
  - Planner review
  - Backlog editing
  - Backlog closing
  - Backlog dashboarding

## 4. Supply Management

- Module name: Supply Management
- Purpose: Track sparepart readiness for backlog items and push items forward when all parts are ready.
- Main pages:
  - `/supply/backlog`
  - `/supply/backlog/:id`
- Main components:
  - `src/pages/Backlog/SupplyList.tsx`
  - `src/pages/Backlog/SupplyDetail.tsx`
  - `src/components/SupplyStatusBadge.tsx`
  - export utility: `src/utils/exportSupplyListExcel.ts`
- Main database tables:
  - `backlogs`
  - `backlog_spareparts`
  - `notifications`
- Related workflows:
  - Supply update
  - Estimated ready-date follow-up
  - Ready-for-scheduling transition
  - Supply list export

## 5. Scheduling And Shutdown Planning

- Module name: Scheduling And Shutdown Planning
- Purpose: Convert ready backlog items into dated work, assign mechanics, associate shutdown events, and visualize scheduled work.
- Main pages:
  - `/backlog/scheduling`
  - `/backlog/work-schedule`
  - `/backlog/shutdown-planner`
- Main components:
  - `src/pages/Backlog/BacklogScheduling.tsx`
  - `src/pages/Backlog/WorkSchedule.tsx`
  - `src/pages/Backlog/ShutdownPlanner.tsx`
  - export utilities:
    - `src/utils/exportWorkScheduleExcel.ts`
    - `src/utils/exportShutdownSchedule.ts`
- Main database tables:
  - `backlogs`
  - `backlog_assignments`
  - `shutdown_events`
  - `manpower`
  - `notifications`
- Related workflows:
  - Regular backlog scheduling
  - Shutdown backlog scheduling
  - Shutdown event maintenance
  - Work calendar visualization

## 6. Notifications

- Module name: Notifications
- Purpose: Show, count, create, and acknowledge application notifications tied mainly to backlog workflow changes.
- Main pages:
  - `/notifications`
- Main components:
  - `src/pages/Notifications.tsx`
  - `src/utils/notif.ts`
  - notification badge logic inside `src/components/Layout.tsx`
- Main database tables:
  - `notifications`
  - `backlogs`
- Related workflows:
  - Notification insert on status change
  - Realtime badge refresh
  - Mark-as-read behavior

## 7. Mine Maintenance

- Module name: Mine Maintenance
- Purpose: Manage equipment, components, hour-meter history, weekly checks, planned maintenance, executed maintenance, and planning output.
- Main pages:
  - `/mine-maintenance/dashboard`
  - `/mine-maintenance/equipment`
  - `/mine-maintenance/equipment/:id`
  - `/mine-maintenance/components`
  - `/mine-maintenance/hour-meter`
  - `/mine-maintenance/weekly-check`
  - `/mine-maintenance/schedule`
  - `/mine-maintenance/records`
  - `/mine-maintenance/planning`
  - `/mine-maintenance/settings`
- Main components:
  - `src/context/MaintenanceContext.tsx`
  - `src/pages/MineMaintenance/MineRouter.tsx`
  - `src/pages/MineMaintenance/Dashboard.tsx`
  - `src/pages/MineMaintenance/Equipment.tsx`
  - `src/pages/MineMaintenance/EquipmentDetail.tsx`
  - `src/pages/MineMaintenance/Components.tsx`
  - `src/pages/MineMaintenance/HourMeter.tsx`
  - `src/pages/MineMaintenance/WeeklyCheck.tsx`
  - `src/pages/MineMaintenance/MaintenanceSchedule.tsx`
  - `src/pages/MineMaintenance/MaintenanceRecords.tsx`
  - `src/pages/MineMaintenance/MaintenancePlanning.tsx`
  - modals under `src/components/mine/modals/`
- Main database tables:
  - `equipment`
  - `components`
  - `hour_meter_readings`
  - `maintenance_settings`
  - `maintenance_records`
  - `maintenance_schedules`
  - `maintenance_executions`
  - `service_types`
  - `employees`
  - `weekly_check_schedule`
- Related workflows:
  - Equipment CRUD
  - Component CRUD
  - Hour-meter update
  - Weekly check planning and completion
  - Maintenance schedule creation
  - Maintenance execution recording
  - Maintenance planning export

## 8. Tool Room

- Module name: Tool Room
- Purpose: Manage tool inventory, borrow/return activity, return-photo evidence, dashboards, and reporting.
- Main pages:
  - `/toolroom/dashboard`
  - `/toolroom/list`
  - `/toolroom/borrow`
  - `/toolroom/reports`
  - `/toolroom/detail/:id`
  - `/toolroom/return-tools`
- Main components:
  - `src/pages/ToolRoom/ToolRoomRouter.tsx`
  - `src/pages/ToolRoom/pages/Dashboard.tsx`
  - `src/pages/ToolRoom/pages/ToolList.tsx`
  - `src/pages/ToolRoom/pages/BorrowReturn.tsx`
  - `src/pages/ToolRoom/pages/Reports.tsx`
  - `src/pages/ToolRoom/pages/ReturnTools.tsx`
  - `src/pages/ToolRoom/components/ToolForm.tsx`
  - `src/pages/ToolRoom/components/BarcodeScanner.tsx`
  - `src/pages/ToolRoom/components/ReturnPhotoModal.tsx`
- Main database tables:
  - `tools`
  - `tool_loans`
  - `employees`
- Main storage buckets:
  - `tool-returns`
- Related workflows:
  - Tool CRUD
  - Tool borrowing
  - Tool return with photo upload
  - Tool-room reporting

## 9. Operational Energy Monitoring

- Module name: Operational Energy Monitoring
- Purpose: Input meter readings and calculate monthly energy consumption and transmission efficiency views.
- Main pages:
  - `/operational/energy-input`
  - `/operational/energy-monitoring`
- Main components:
  - `src/pages/Operational/EnergyInput.tsx`
  - `src/pages/Operational/EnergyMonitoring.tsx`
- Main database tables:
  - `energy_meter_readings`
- Related workflows:
  - Energy meter input
  - Yearly monitoring charts

## 10. Offline, PWA, And Update Infrastructure

- Module name: Offline, PWA, And Update Infrastructure
- Purpose: Provide service-worker registration, static asset version checks, and a lightweight offline write queue.
- Main pages:
  - cross-cutting, no dedicated route
- Main components:
  - `src/components/AutoUpdateHandler.tsx`
  - `src/offline/queueDB.ts`
  - `src/offline/queueService.ts`
  - `src/offline/safeDb.ts`
  - `src/offline/syncService.ts`
  - `src/hooks/useNetworkStatus.ts`
  - `src/main.tsx`
  - `vite.config.ts`
- Main storage:
  - IndexedDB `msm-offline-db`
  - `public/version.json`
- Related workflows:
  - Service-worker registration
  - Version polling and refresh prompt
  - Offline queueing and replay

## Active Route Map

```mermaid
flowchart TD
    Root[/] --> Home
    Root --> Login
    Root --> Reports
    Root --> Backlog
    Root --> Supply
    Root --> Mine
    Root --> ToolRoom
    Root --> Ops
    Root --> Admin

    Reports --> Dashboard
    Reports --> Validation
    Reports --> Pareto
    Reports --> Download

    Backlog --> BacklogDashboard
    Backlog --> BacklogInput
    Backlog --> BacklogValidation
    Backlog --> PlannerReview
    Backlog --> Scheduling
    Backlog --> WorkSchedule
    Backlog --> ShutdownPlanner

    Supply --> SupplyList
    Supply --> SupplyDetail

    Mine --> MMRouter
    ToolRoom --> ToolRoomRouter
    Ops --> EnergyInput
    Ops --> EnergyMonitoring
    Admin --> Configuration
    Admin --> UserActivation
```
