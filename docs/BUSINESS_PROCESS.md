# BUSINESS PROCESS

## Document Information

| Item         | Value                           |
| ------------ | ------------------------------- |
| Document     | Business Process                |
| System       | MSM Application                 |
| Module       | Maintenance & Supply Management |
| Version      | Current Production              |
| Last Updated | June 2026                       |

---

# Purpose

Dokumen ini menjelaskan proses bisnis yang diakomodasi oleh MSM Application.

Fokus utama sistem adalah memastikan seluruh kebutuhan maintenance dapat terdokumentasi, direncanakan, dieksekusi, dan ditelusuri secara terstruktur.

---

# Maintenance Work Management Philosophy

Dalam aktivitas maintenance terdapat tiga kategori pekerjaan:

## 1. Reactive Work

Pekerjaan akibat breakdown atau kerusakan yang membutuhkan tindakan segera.

Contoh:

* Conveyor trip
* Motor terbakar
* Pump gagal beroperasi

Biasanya ditangani langsung melalui proses repair tanpa backlog.

---

## 2. Planned Work

Pekerjaan yang telah diketahui tetapi belum dapat langsung dilaksanakan.

Contoh:

* Bearing mulai aus
* Structural crack
* Hose mulai bocor
* Modifikasi equipment

Kategori ini dikelola menggunakan Backlog Management.

---

## 3. Improvement Work

Pekerjaan peningkatan reliability, safety, atau productivity.

Contoh:

* Guarding improvement
* Layout modification
* Automation project

Kategori ini juga dikelola melalui backlog.

---

# Business Objective

MSM Application dikembangkan untuk memastikan:

* Tidak ada pekerjaan hilang.
* Kebutuhan resource diketahui sejak awal.
* Pekerjaan dapat diprioritaskan.
* Planner memiliki backlog yang akurat.
* Management memiliki visibility terhadap pekerjaan tertunda.

---

# Backlog Management Process

## Step 1 — Backlog Identification

### Responsible

* Mechanic
* General Leader
* Supervisor

### Activity

Mengidentifikasi pekerjaan yang belum dapat langsung dieksekusi.

### Output

Draft Backlog

---

## Step 2 — Backlog Validation

### Responsible

Supervisor

### Objective

Memastikan backlog yang masuk memang valid dan layak diproses.

### Validation Criteria

* Problem jelas.
* Unit benar.
* Tidak duplikasi.
* Prioritas sesuai.
* Kebutuhan resource sesuai.

### Output

Validated Backlog

---

## Step 3 — Planner Review

### Responsible

Planner

### Objective

Menentukan kebutuhan pekerjaan secara lebih detail.

### Review Activities

* Review sparepart requirement.
* Review tools requirement.
* Review manpower requirement.
* Review shutdown requirement.

### Decision

Planner menentukan:

* Siap Dijadwalkan
  atau
* Menunggu Shutdown

### Output

Reviewed Backlog

---

## Step 4 — Supply Management Process

### Responsible

Supply Management

### Objective

Memberikan status ketersediaan sparepart.

### Activities

* Verifikasi stock.
* Verifikasi procurement status.
* Input estimasi kedatangan.
* Update progress.

### Output

Supply Readiness Status

---

## Step 5 — Scheduling

### Responsible

Planner

### Objective

Menentukan waktu pelaksanaan pekerjaan.

### Activities

* Menentukan tanggal pelaksanaan.
* Menentukan manpower.
* Menghubungkan dengan shutdown event jika diperlukan.

### Output

Scheduled Backlog

---

## Step 6 — Execution

### Responsible

Mechanic

### Objective

Melaksanakan pekerjaan sesuai jadwal.

### Activities

* Melakukan pekerjaan.
* Menggunakan resource yang telah disiapkan.
* Menyelesaikan pekerjaan.

### Output

Completed Work

---

## Step 7 — Closing

### Responsible

Mechanic / Supervisor

### Objective

Menutup pekerjaan yang telah selesai.

### Activities

* Input tanggal close.
* Input nama mekanik.
* Konfirmasi pekerjaan selesai.

### Output

Closed Backlog

---

# Sparepart Management Process

## Purpose

Menjamin kebutuhan sparepart diketahui sejak backlog dibuat.

## Workflow

Backlog Created
↓
Part Requirement Identified
↓
Planner Review
↓
Supply Verification
↓
Ready / Order Process
↓
Scheduling

---

# Shutdown Management Process

## Purpose

Mengelola pekerjaan yang membutuhkan penghentian operasi.

## Workflow

Backlog Created
↓
Shutdown Required
↓
Planner Review
↓
Waiting Shutdown
↓
Shutdown Event Available
↓
Scheduled
↓
Execution

---

# Scheduling Philosophy

Scheduling dilakukan setelah:

* Resource tersedia.
* Shutdown tersedia (jika diperlukan).
* Prioritas ditentukan.

Tujuan utama scheduling adalah meningkatkan:

* Labor utilization
* Equipment availability
* Work execution effectiveness

---

# Priority Classification

## High

Unit berpotensi mengalami breakdown dalam waktu dekat.

Target:

Kurang dari 1 minggu.

---

## Medium

Risiko kegagalan meningkat tetapi masih dapat beroperasi.

Target:

Kurang dari 1 bulan.

---

## Low

Masih dapat beroperasi dengan aman dalam jangka waktu lebih panjang.

Target:

Lebih dari 1 bulan.

---

## Improve

Pekerjaan improvement atau project.

Target:

Berdasarkan kebutuhan bisnis.

---

# Roles and Responsibilities

| Role              | Responsibility                    |
| ----------------- | --------------------------------- |
| Mechanic          | Input backlog, execution, closing |
| General Leader    | Input backlog                     |
| Supervisor        | Validation                        |
| Planner           | Review, scheduling                |
| Supply Management | Sparepart readiness               |
| Administrator     | System management                 |

---

# Key Performance Indicators

Business process ini dirancang untuk mendukung pengukuran:

## Maintenance KPI

* Backlog Quantity
* Backlog Aging
* Schedule Compliance
* Work Completion Rate

## Supply KPI

* Sparepart Readiness
* Procurement Lead Time

## Reliability KPI

* MTBF
* MTTR
* Equipment Availability

---

# Future Business Process Expansion

MSM Application direncanakan berkembang menuju:

Reactive Maintenance
↓
Planned Maintenance
↓
Data Driven Maintenance
↓
AI Assisted Maintenance
↓
Predictive Maintenance

Tujuan akhirnya adalah meningkatkan reliability equipment melalui pengambilan keputusan berbasis data.
