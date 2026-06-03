# STATUS MATRIX

## Document Information

| Item         | Value              |
| ------------ | ------------------ |
| Document     | Status Matrix      |
| System       | MSM Application    |
| Module       | Backlog Management |
| Version      | Current Production |
| Last Updated | June 2026          |

---

# Purpose

Dokumen ini menjelaskan seluruh status yang digunakan dalam workflow Backlog Management MSM Application.

Tujuan utama:

* Menyamakan pemahaman seluruh pengguna.
* Menjadi referensi pengembangan sistem.
* Menjadi acuan audit dan troubleshooting.
* Menjelaskan hak akses perubahan status.

---

# Workflow Overview

Draft
↓
Validated
↓
Reviewed
↓
┌─────────────────────┐
↓                     ↓
Siap Dijadwalkan   Menunggu Shutdown
↓                     ↓
└─────────────↓───────┘
Dijadwalkan
↓
Closed

Rejected dapat terjadi setelah proses Validation atau Review.

---

# Status Definition

## DRAFT

### Description

Backlog baru yang dibuat oleh user.

### Created By

* Mechanic
* General Leader
* Supervisor
* Authorized User

### Purpose

Mencatat pekerjaan yang belum dapat langsung dieksekusi.

### Allowed Next Status

* validated
* rejected

### Editable Fields

Semua field masih dapat diedit.

---

## VALIDATED

### Description

Backlog telah diverifikasi oleh Supervisor.

### Created By

Supervisor

### Purpose

Memastikan backlog valid dan memang perlu ditindaklanjuti.

### Validation Checklist

* Problem jelas
* Unit benar
* Prioritas sesuai
* Resource requirement sesuai

### Allowed Next Status

* reviewed
* rejected

---

## REVIEWED

### Description

Backlog telah direview oleh Planner.

### Created By

Planner

### Purpose

Menentukan kesiapan pekerjaan berdasarkan resource yang tersedia.

### Review Checklist

* Sparepart requirement
* Tool requirement
* Manpower requirement
* Shutdown requirement

### Allowed Next Status

* siap_dijadwalkan
* menunggu_shutdown
* rejected

---

## SIAP_DIJADWALKAN

### Description

Semua resource tersedia dan backlog siap dijadwalkan.

### Created By

Planner

### Requirements

Jika membutuhkan:

* Sparepart → semua part ready
* Tools → tersedia
* Manpower → tersedia

### Allowed Next Status

* dijadwalkan

---

## MENUNGGU_SHUTDOWN

### Description

Pekerjaan membutuhkan shutdown dan menunggu event shutdown tersedia.

### Created By

Planner

### Requirements

* Shutdown diperlukan
* Resource telah tersedia

### Allowed Next Status

* dijadwalkan

### Notes

Status ini hanya digunakan untuk pekerjaan yang memerlukan shutdown.

---

## DIJADWALKAN

### Description

Backlog telah masuk jadwal pelaksanaan.

### Created By

Planner

### Required Information

* Scheduled Date
* Assigned Mechanic
* Execution Notes (optional)

### Allowed Next Status

* closed

---

## CLOSED

### Description

Pekerjaan telah selesai dilaksanakan.

### Created By

Mechanic / Supervisor

### Required Information

* Closing Date
* Mechanic Name
* Completion Confirmation

### Final Status

Ya

Tidak dapat kembali ke status sebelumnya.

---

## REJECTED

### Description

Backlog ditolak dan tidak akan diproses lebih lanjut.

### Created By

Supervisor atau Planner

### Common Reasons

* Duplikasi backlog
* Problem tidak valid
* Data tidak lengkap
* Tidak memerlukan tindak lanjut

### Final Status

Ya

Tidak dapat kembali ke status sebelumnya.

---

# Status Transition Matrix

| Current Status    | Next Status Allowed                           |
| ----------------- | --------------------------------------------- |
| draft             | validated, rejected                           |
| validated         | reviewed, rejected                            |
| reviewed          | siap_dijadwalkan, menunggu_shutdown, rejected |
| siap_dijadwalkan  | dijadwalkan                                   |
| menunggu_shutdown | dijadwalkan                                   |
| dijadwalkan       | closed                                        |
| closed            | -                                             |
| rejected          | -                                             |

---

# User Role Authority

| Role              | Draft       | Validate    | Review      | Schedule    | Close       |
| ----------------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| Mechanic          | Create      | No          | No          | No          | Yes         |
| General Leader    | Create      | No          | No          | No          | Yes         |
| Supervisor        | Create      | Yes         | No          | No          | Yes         |
| Planner           | View        | No          | Yes         | Yes         | View        |
| Supply Management | View        | No          | No          | No          | View        |
| Administrator     | Full Access | Full Access | Full Access | Full Access | Full Access |

---

# System Rules

## Rule 1

Backlog harus melalui proses Validation sebelum dapat direview Planner.

---

## Rule 2

Backlog tidak boleh langsung berubah dari Draft ke Reviewed.

---

## Rule 3

Backlog yang membutuhkan shutdown tidak boleh masuk status Siap Dijadwalkan.

---

## Rule 4

Backlog yang membutuhkan sparepart tidak boleh masuk status Siap Dijadwalkan sebelum seluruh sparepart berstatus Ready.

---

## Rule 5

Status Closed dan Rejected bersifat final.

---

# Future Status Candidates

Status berikut direncanakan untuk pengembangan masa depan:

* waiting_sparepart
* waiting_tool
* waiting_manpower
* execution
* verification

Belum digunakan pada versi saat ini.
