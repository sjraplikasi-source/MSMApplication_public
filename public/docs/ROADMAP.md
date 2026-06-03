# MSM APPLICATION ROADMAP

## Document Information

| Item            | Value                                             |
| --------------- | ------------------------------------------------- |
| Application     | MSM (Maintenance & Supply Management) Application |
| Owner           | Maintenance Department                            |
| Platform        | React + Supabase + PWA                            |
| Current Version | Production                                        |
| Last Updated    | June 2026                                         |

---

# Vision

MSM Application dikembangkan sebagai platform terintegrasi untuk mendukung aktivitas Maintenance, Planning, Reliability, Supply Management, Tool Management, dan Operational Support pada lingkungan pertambangan.

Tujuan jangka panjang adalah membangun satu sistem terpusat yang mampu mengelola seluruh siklus aktivitas maintenance mulai dari identifikasi masalah, backlog management, resource planning, scheduling, execution, hingga analisa historis dan predictive maintenance.

---

# Development Roadmap

## Phase 1 — Repair & Maintenance Reporting

### Status: Completed

Objective:
Digitalisasi pelaporan aktivitas repair dan maintenance.

Features:

* Repair Report
* Historical Maintenance Record
* Search & Filter Report
* Export Data
* Dashboard Monitoring

Outcome:
Seluruh histori repair dan maintenance terdokumentasi secara digital.

---

## Phase 2 — Backlog Management

### Status: Completed

Objective:
Membangun sistem backlog terstruktur dan terdokumentasi.

Features:

* Backlog Registration
* Auto Registration Number
* Backlog Validation
* Planner Review
* Rejection Workflow
* Priority Classification
* Duplicate Backlog Detection

Outcome:
Seluruh pekerjaan yang belum dapat dieksekusi dapat dimonitor dan dikendalikan.

---

## Phase 3 — Resource Management

### Status: Completed

Objective:
Mengidentifikasi kebutuhan resource sejak backlog dibuat.

Features:

* Sparepart Requirement
* Tool Requirement
* Manpower Requirement
* Shutdown Requirement
* Supply Management Progress

Outcome:
Planner dapat mengetahui kebutuhan pekerjaan sebelum scheduling dilakukan.

---

## Phase 4 — Scheduling & Shutdown Management

### Status: Completed

Objective:
Mengintegrasikan backlog dengan jadwal pelaksanaan.

Features:

* Backlog Scheduling
* Mechanic Assignment
* Shutdown Event Management
* Shutdown Linking
* Scheduling Dashboard

Outcome:
Perencanaan pekerjaan menjadi lebih terstruktur dan terdokumentasi.

---

## Phase 5 — Mine Maintenance Module

### Status: Completed

Objective:
Mengelola aktivitas maintenance unit mobile equipment.

Features:

* Equipment Master
* Hour Meter Management
* Service Tracking
* Maintenance History
* Unit Monitoring

Outcome:
Data maintenance unit dapat dimonitor dalam satu platform.

---

## Phase 6 — Tool Room Management

### Status: Completed

Objective:
Mengendalikan peminjaman dan penggunaan tools.

Features:

* Tool Registration
* Tool Borrowing
* Tool Return
* Tool Tracking
* Tool Inventory Monitoring

Outcome:
Penggunaan tools lebih terkontrol dan terdokumentasi.

---

## Phase 7 — Mobile & PWA Deployment

### Status: Completed

Objective:
Menyediakan akses lintas perangkat.

Features:

* Progressive Web Application (PWA)
* Android Packaging
* Mobile Responsive Interface
* Offline Asset Caching

Outcome:
Aplikasi dapat digunakan melalui desktop maupun perangkat mobile.

---

## Phase 8 — Offline Capability

### Status: In Progress

Objective:
Memungkinkan pengguna tetap bekerja tanpa koneksi internet.

Planned Features:

* Offline Data Entry
* Local Queue Storage
* Background Synchronization
* Conflict Resolution
* Offline Status Indicator

Expected Outcome:
Aktivitas maintenance tetap dapat berjalan di area tanpa sinyal internet.

---

## Phase 9 — AI Assistant

### Status: Planned

Objective:
Menyediakan asisten digital berbasis AI untuk mendukung pengambilan keputusan maintenance.

Planned Features:

* AI Maintenance Assistant
* Backlog Recommendation
* Historical Similarity Search
* Troubleshooting Suggestion
* Work Planning Assistance

Expected Outcome:
Percepatan analisa dan pengambilan keputusan teknis.

---

## Phase 10 — Reliability & Predictive Maintenance

### Status: Future Development

Objective:
Mengembangkan sistem dari reactive maintenance menjadi predictive maintenance.

Planned Features:

* Failure Pattern Analysis
* MTBF Monitoring
* MTTR Monitoring
* Reliability Dashboard
* Predictive Maintenance Recommendation

Expected Outcome:
Peningkatan availability dan reliability equipment.

---

# Long-Term Architecture Target

Maintenance Operations
↓
MSM Application
↓
Central Maintenance Database
↓
Analytics Engine
↓
AI Assistant
↓
Predictive Maintenance Platform

---

# Guiding Principles

1. Mobile First
2. Maintenance Driven
3. Operationally Practical
4. Data Integrity First
5. Offline Capable
6. Scalable Architecture
7. AI Ready
8. Low Operating Cost

---

# Current Priority

1. Stabilization of Existing Modules
2. Offline Capability Completion
3. Android Deployment
4. Documentation Improvement
5. AI Assistant Integration
6. Reliability Analytics Development
