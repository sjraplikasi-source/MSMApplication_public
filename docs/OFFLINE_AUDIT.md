# Offline Audit

## Scope

Audit ini hanya mendokumentasikan kondisi aktual implementasi offline yang ada di source code MSM Application, dengan fokus pada:

- seluruh file di `src/offline/`
- seluruh penggunaan:
  - `safeInsert()`
  - `safeUpdate()`
  - `safeDelete()`
  - `syncQueue()`
  - `addToQueue()`
- seluruh page, component, hook, atau service yang memakai mekanisme tersebut

Audit ini tidak mengusulkan perubahan kode otomatis. Isi dokumen ini adalah pemetaan implementasi yang ada, temuan, dan level risiko.

## Files Audited

### Offline Core

- `src/offline/queueDB.ts`
- `src/offline/queueService.ts`
- `src/offline/safeDb.ts`
- `src/offline/syncService.ts`

### Runtime Integration

- `src/App.tsx`
- `src/pages/Backlog/BacklogForm.tsx`
- `src/hooks/useNetworkStatus.ts`

## Executive Summary

Implementasi offline MSM Application saat ini bersifat sangat terbatas dan hanya benar-benar dipakai pada proses pembuatan backlog di `BacklogForm`.

Arsitektur offline yang ada terdiri dari:

- IndexedDB queue (`msm-offline-db`, object store `queue`)
- helper generik `safeInsert`, `safeUpdate`, `safeDelete`
- replay engine `syncQueue()`
- trigger sinkronisasi di level aplikasi saat:
  - app start jika online
  - event browser `online`
  - polling setiap 60 detik

Namun, dari sisi pemakaian aktual:

- `safeInsert()` hanya dipakai di `BacklogForm`
- `safeUpdate()` tidak dipakai sama sekali
- `safeDelete()` tidak dipakai sama sekali
- `useNetworkStatus()` tidak dipakai sama sekali

Risiko paling serius yang ditemukan:

1. hasil operasi queue replay tidak pernah memeriksa `error` dari response Supabase, sehingga item queue bisa terhapus walaupun operasi database gagal
2. backlog offline memakai pola parent-child, tetapi ID hasil insert parent tidak tersedia saat offline, sehingga child rows dapat terqueue dengan `backlog_id = undefined`

## A. Arsitektur Offline Yang Saat Ini Benar-Benar Berjalan

## 1. Queue Storage Layer

File: `src/offline/queueDB.ts`

Implementasi aktual:

- membuat IndexedDB database `msm-offline-db`
- membuat object store `queue`
- `keyPath = "id"`
- `autoIncrement = true`

Artinya, semua operasi offline disimpan sebagai item queue lokal dengan ID auto-increment.

## 2. Queue Write Layer

File: `src/offline/queueService.ts`

Implementasi aktual:

- `addToQueue(action, payload)` menambahkan item ke object store `queue`
- struktur item queue:
  - `action`
  - `payload`
  - `created_at`

Tidak ada metadata tambahan seperti:

- retry count
- sync status
- entity correlation ID
- dependency marker parent-child

## 3. Safe DB Abstraction

File: `src/offline/safeDb.ts`

Implementasi aktual:

- `safeInsert(table, data)`
  - jika online:
    - insert langsung ke Supabase
    - `.select().single()`
    - return row hasil insert
  - jika offline:
    - enqueue action `INSERT`
    - tidak return row hasil insert

- `safeUpdate(table, data, match)`
  - jika online:
    - update langsung ke Supabase
  - jika offline:
    - enqueue action `UPDATE`

- `safeDelete(table, match)`
  - jika online:
    - delete langsung ke Supabase
  - jika offline:
    - enqueue action `DELETE`

## 4. Queue Replay Layer

File: `src/offline/syncService.ts`

Implementasi aktual:

- membuka transaction `readwrite` pada store `queue`
- mengambil seluruh queue dengan `store.getAll()`
- memproses item satu per satu secara berurutan
- untuk tiap item:
  - `INSERT` -> `supabase.from(payload.table).insert(payload.data)`
  - `UPDATE` -> `supabase.from(payload.table).update(payload.data).match(payload.match)`
  - `DELETE` -> `supabase.from(payload.table).delete().match(payload.match)`
- setelah tiap item diproses:
  - `store.delete(item.id)`
- jika terjadi exception:
  - log `"Sync gagal"`
  - berhenti memproses item berikutnya

## 5. Sync Trigger Layer

File: `src/App.tsx`

Implementasi aktual:

- memanggil `syncQueue()` saat app load jika `navigator.onLine === true`
- menambahkan listener `window.addEventListener("online", handleOnline)`
- memanggil `syncQueue()` setiap 60 detik selama online

Secara praktis, queue replay bersifat global dan tidak spesifik ke fitur tertentu.

## 6. Feature Integration Layer

File: `src/pages/Backlog/BacklogForm.tsx`

Implementasi aktual yang benar-benar memakai offline:

- saat membuat backlog header:
  - `safeInsert("backlogs", ...)`
- saat membuat spareparts child rows:
  - `safeInsert("backlog_spareparts", ...)`
- saat membuat tools child rows:
  - `safeInsert("backlog_tools", ...)`
- saat membuat manpower child rows:
  - `safeInsert("backlog_manpower", ...)`

Tambahan perilaku offline pada halaman ini:

- jika offline, registration code digenerate lokal:
  - format `BL-YYYYMMDD-RAND`

Tetapi operasi lain pada page ini tetap online-dependent:

- pengecekan backlog serupa
- lookup equipment
- guard uniqueness ke `backlogs.registration_code`
- upload gambar ke bucket `sparepart-images`

## 7. Hook Terkait Status Network

File: `src/hooks/useNetworkStatus.ts`

Implementasi aktual:

- hook untuk mendeteksi online/offline dengan event browser

Status pemakaian:

- tidak dipakai oleh page/component/service manapun

## B. Daftar Fitur: Fully Implemented / Partially Implemented / Unused

## Fully Implemented

Bagian ini berarti fitur tersebut benar-benar ada end-to-end sesuai perilaku yang tertulis di kode, walaupun tidak selalu aman secara integritas data.

### 1. Penyimpanan queue lokal di IndexedDB

- Status: Fully implemented
- Evidensi:
  - `queueDB.ts`
  - `queueService.ts`

### 2. Trigger sinkronisasi global saat online

- Status: Fully implemented
- Evidensi:
  - `App.tsx`
  - startup sync
  - browser `online` event sync
  - interval 60 detik

### 3. Fallback generation registration code saat offline

- Status: Fully implemented
- Evidensi:
  - `BacklogForm.tsx`

## Partially Implemented

### 1. Offline create backlog

- Status: Partially implemented
- Alasan:
  - header backlog bisa masuk queue
  - child rows juga bisa masuk queue
  - tetapi parent-child linkage tidak aman saat offline
  - UI tidak memiliki tracking status queue per backlog

### 2. Queue replay ke Supabase

- Status: Partially implemented
- Alasan:
  - loop replay ada
  - urutan processing ada
  - tetapi response `error` dari Supabase tidak diperiksa
  - tidak ada retry metadata atau status observability

### 3. Offline abstraction generik (`safeInsert`, `safeUpdate`, `safeDelete`)

- Status: Partially implemented
- Alasan:
  - helper tersedia untuk insert/update/delete
  - tetapi hanya insert yang benar-benar dipakai
  - tidak ada pembuktian operasional untuk update/delete di flow aplikasi

### 4. Offline support untuk backlog dengan attachment gambar

- Status: Partially implemented
- Alasan:
  - data text bisa di-queue
  - upload gambar ke Supabase Storage tetap butuh koneksi online
  - tidak ada local file queue untuk attachment

## Unused / Belum Pernah Dipakai

### 1. `safeUpdate()`

- Status: Unused
- Evidensi:
  - tidak ada call site selain deklarasinya sendiri

### 2. `safeDelete()`

- Status: Unused
- Evidensi:
  - tidak ada call site selain deklarasinya sendiri

### 3. `useNetworkStatus()`

- Status: Unused
- Evidensi:
  - tidak ada import/pemakaian di komponen lain

## Pemetaan Penggunaan Aktual

## `safeInsert()`

Dipakai di:

- `src/pages/Backlog/BacklogForm.tsx`
  - insert `backlogs`
  - insert `backlog_spareparts`
  - insert `backlog_tools`
  - insert `backlog_manpower`

Tidak dipakai di page lain.

## `safeUpdate()`

Dipakai di:

- tidak ada pemakaian aktual

## `safeDelete()`

Dipakai di:

- tidak ada pemakaian aktual

## `addToQueue()`

Dipakai secara tidak langsung oleh:

- `safeInsert()`
- `safeUpdate()`
- `safeDelete()`

Tidak dipanggil langsung dari page/component lain.

## `syncQueue()`

Dipakai di:

- `src/App.tsx`
  - on app load
  - on `online` event
  - on periodic interval

## C. Findings

## Critical

### F-01. Queue replay tidak memeriksa `error` dari response Supabase

- Risk Level: Critical
- Lokasi:
  - `src/offline/syncService.ts:20-43`
- Detail:
  - `await supabase.from(...).insert(...)`
  - `await supabase.from(...).update(...).match(...)`
  - `await supabase.from(...).delete(...).match(...)`
  - seluruh operasi di atas tidak pernah destructure `{ error }`
  - pada Supabase JS, error database tidak otomatis melempar exception; error biasanya dikembalikan di response object
- Dampak:
  - item queue dapat dianggap sukses
  - `store.delete(item.id)` tetap dijalankan
  - data lokal hilang dari queue walaupun insert/update/delete di server gagal
- Efek integritas data:
  - silent data loss
  - queue terlihat bersih padahal server tidak menerima perubahan

### F-02. Offline create backlog membutuhkan ID parent, tetapi `safeInsert()` offline tidak mengembalikan ID

- Risk Level: Critical
- Lokasi:
  - `src/offline/safeDb.ts:23-26`
  - `src/pages/Backlog/BacklogForm.tsx:237-272`
- Detail:
  - saat online, `safeInsert("backlogs")` mengembalikan row hasil insert
  - saat offline, `safeInsert("backlogs")` hanya enqueue dan tidak return row
  - `const backlogId = (backlog as any)?.id` akan menjadi `undefined` saat offline
  - child insert berikutnya memakai `backlog_id: backlogId`
- Dampak:
  - `backlog_spareparts`
  - `backlog_tools`
  - `backlog_manpower`
  - semuanya dapat masuk queue dengan `backlog_id = undefined`
- Efek integritas data:
  - child rows bisa gagal insert saat sync
  - atau terinsert tanpa relasi yang valid jika schema mengizinkan null
  - backlog header dan backlog detail dapat terpisah

## High

### F-03. Parent-child transaction backlog tidak atomik saat offline

- Risk Level: High
- Lokasi:
  - `src/pages/Backlog/BacklogForm.tsx:237-272`
  - `src/offline/syncService.ts`
- Detail:
  - satu backlog dibuat lewat beberapa operasi terpisah:
    - insert `backlogs`
    - insert `backlog_spareparts`
    - insert `backlog_tools`
    - insert `backlog_manpower`
  - queue replay memproses item satu per satu, bukan sebagai transaksi bisnis tunggal
- Dampak:
  - sebagian data backlog bisa tersinkronisasi
  - sebagian lagi gagal atau tertinggal di queue
- Efek integritas data:
  - backlog header bisa muncul tanpa resource detail
  - atau hanya sebagian child rows yang ada

### F-04. `safeUpdate()` dan `safeDelete()` ada tetapi belum pernah diuji oleh flow nyata aplikasi

- Risk Level: High
- Lokasi:
  - `src/offline/safeDb.ts`
- Detail:
  - helper tersedia
  - tetapi tidak ada call site aktual di repo
- Dampak:
  - bila nanti dipakai, perilaku riil offline update/delete belum tervalidasi oleh penggunaan aplikasi saat ini
- Efek integritas data:
  - potensi bug latent pada saat fitur lain mulai memakainya

### F-05. Operasi sync dapat dipanggil paralel tanpa locking

- Risk Level: High
- Lokasi:
  - `src/App.tsx:158-170`
  - `src/offline/syncService.ts`
- Detail:
  - `syncQueue()` dipanggil dari beberapa trigger
  - tidak ada mutex, flag `isSyncing`, atau queue lock
  - jika dua trigger aktif berdekatan, dua proses bisa membaca queue yang sama
- Dampak:
  - operasi yang sama berpotensi direplay lebih dari sekali
  - terutama untuk insert yang tidak idempotent
- Efek integritas data:
  - duplikasi row
  - hasil queue tidak deterministik

## Medium

### F-06. Validasi uniqueness registration code tidak benar-benar offline-safe

- Risk Level: Medium
- Lokasi:
  - `src/pages/Backlog/BacklogForm.tsx:225-235`
- Detail:
  - sebelum insert backlog, code melakukan query ke Supabase untuk guard uniqueness
  - saat offline, guard ini tidak punya jaminan efektif karena tetap bergantung ke network/database
  - fallback offline hanya mengandalkan random lokal
- Dampak:
  - potensi collision kecil tetapi tetap ada
  - tidak ada rekonsiliasi uniqueness saat sync

### F-07. Fitur offline backlog masih bergantung pada beberapa read path online

- Risk Level: Medium
- Lokasi:
  - `BacklogForm.tsx`
- Detail:
  - equipment options tetap diambil online
  - duplicate backlog suggestion tetap diambil online
  - upload attachment tetap online
- Dampak:
  - user memang bisa submit queue kalau data form sudah tersedia
  - tetapi pengalaman offline tidak lengkap sebagai feature domain

### F-08. Attachment sparepart tidak masuk ke mekanisme offline

- Risk Level: Medium
- Lokasi:
  - `src/pages/Backlog/BacklogForm.tsx:180-217`
- Detail:
  - gambar diupload langsung ke Supabase Storage
  - tidak ada local queue untuk file upload
- Dampak:
  - backlog bisa terqueue tanpa gambar yang dimaksud user
  - user bisa menganggap attachment ikut tersimpan padahal tidak

### F-09. Queue item tidak punya retry metadata atau state observability

- Risk Level: Medium
- Lokasi:
  - `src/offline/queueService.ts`
  - `src/offline/queueDB.ts`
- Detail:
  - queue item hanya menyimpan:
    - `action`
    - `payload`
    - `created_at`
- Dampak:
  - sulit audit item mana yang gagal berkali-kali
  - sulit tampilkan status sinkronisasi ke user

## Low

### F-10. `useNetworkStatus()` ada tetapi tidak terintegrasi ke UX offline

- Risk Level: Low
- Lokasi:
  - `src/hooks/useNetworkStatus.ts`
- Detail:
  - hook tersedia
  - tidak dipakai oleh page mana pun
- Dampak:
  - aplikasi tidak memiliki indikator status network terstandar untuk flow offline

## D. Potensi Data Yang Tidak Tersinkronisasi

Berikut skenario data yang berpotensi tidak pernah sinkron atau sinkron secara tidak lengkap.

## 1. Child backlog rows tanpa `backlog_id`

Tabel terdampak:

- `backlog_spareparts`
- `backlog_tools`
- `backlog_manpower`

Penyebab:

- `backlogId` menjadi `undefined` saat offline

Kemungkinan hasil:

- insert child gagal saat sync
- child hilang dari queue jika Supabase mengembalikan `error` tanpa throw
- header backlog tersimpan sendiri

## 2. Attachment gambar sparepart

Objek terdampak:

- file pada bucket `sparepart-images`
- field `image_url` pada row sparepart

Penyebab:

- upload file tidak memakai queue offline

Kemungkinan hasil:

- backlog text data sinkron
- gambar tidak pernah terupload
- `image_url` kosong atau tidak sesuai ekspektasi user

## 3. Operasi queue yang gagal secara bisnis tetapi item queue terhapus

Tabel terdampak:

- semua tabel yang nanti direplay melalui `syncQueue()`

Penyebab:

- `syncQueue()` tidak memeriksa `response.error`

Kemungkinan hasil:

- perubahan dianggap sukses lokal
- tidak ada retry
- data server tidak berubah

## 4. Replay ganda karena sync paralel

Tabel terdampak:

- terutama insert yang non-idempotent:
  - `backlogs`
  - `backlog_spareparts`
  - `backlog_tools`
  - `backlog_manpower`

Penyebab:

- tidak ada locking pada `syncQueue()`

Kemungkinan hasil:

- duplicate insert
- queue terhapus oleh salah satu worker lebih cepat dari worker lain

## E. Tabel Yang Menggunakan `safeInsert()` Tetapi Membutuhkan ID Hasil Insert

## `backlogs`

- Lokasi:
  - `src/pages/Backlog/BacklogForm.tsx:237-251`
- Kebutuhan ID:
  - ID hasil insert backlog dipakai langsung untuk child rows:
    - `backlog_spareparts`
    - `backlog_tools`
    - `backlog_manpower`
- Kesimpulan:
  - `backlogs` adalah tabel yang secara eksplisit membutuhkan ID hasil insert untuk melanjutkan proses berikutnya
  - ini adalah dependency paling penting dalam audit offline saat ini

## Tabel child yang bergantung pada ID `backlogs`

- `backlog_spareparts`
- `backlog_tools`
- `backlog_manpower`

Tiga tabel ini tidak bisa dibentuk dengan benar saat offline kecuali ada cara aman untuk membawa relasi parent `backlog_id`.

## F. Proses Parent-Child Transaction Yang Berpotensi Gagal Saat Offline

## Backlog Creation Transaction

Urutan implementasi saat ini:

1. insert `backlogs`
2. insert `backlog_spareparts` x N
3. insert `backlog_tools` x N
4. insert `backlog_manpower` x N

Masalah saat offline:

- parent tidak memberi ID real-time
- child tetap dibentuk memakai `backlog_id` yang berasal dari parent
- semua langkah dipisah menjadi queue items individual

Risiko:

- parent berhasil, child gagal
- parent gagal, sebagian child tetap dicoba
- parent dan child berhasil tetapi tidak saling terhubung
- replay sebagian menghasilkan backlog yang tidak lengkap

Status audit:

- ini adalah parent-child transaction paling berisiko dalam implementasi offline saat ini

## Coverage Matrix

| Item | Current State | Actual Usage |
|---|---|---|
| `queueDB.ts` | Implemented | Active |
| `queueService.ts` | Implemented | Active indirectly |
| `safeInsert()` | Implemented | Active only in `BacklogForm` |
| `safeUpdate()` | Implemented | Unused |
| `safeDelete()` | Implemented | Unused |
| `syncQueue()` | Implemented | Active globally in `App.tsx` |
| `useNetworkStatus()` | Implemented | Unused |
| Offline backlog header queue | Implemented | Active |
| Offline backlog child queue | Implemented but unsafe | Active |
| Offline file upload | Not implemented | Not available |
| Offline list/detail read model | Not implemented | Not available |

## Current Offline Capability Boundary

Batas kemampuan offline yang benar-benar ada saat ini:

- user dapat menekan submit backlog saat offline
- backlog dan child rows dapat masuk queue lokal
- app akan mencoba replay queue saat online

Di luar itu, implementasi offline belum meluas ke:

- update flow
- delete flow
- report module
- supply module
- tool room
- mine maintenance
- operational energy
- attachment/file queue
- local read cache
- visible sync status per record

## Final Assessment

Implementasi offline MSM Application saat ini masih berada pada level "early-stage write queue" dan belum menjadi offline architecture yang menyeluruh.

Yang benar-benar berjalan:

- queue lokal
- enqueue generic
- replay trigger global
- satu flow write offline di backlog input

Yang paling perlu dicatat dari audit ini:

- offline engine sudah ada, tetapi coverage fungsionalnya sangat sempit
- parent-child backlog creation adalah titik risiko integritas data tertinggi
- replay queue saat ini berpotensi silent failure karena tidak memeriksa `error` response Supabase

Secara operasional, fitur offline saat ini belum bisa dianggap aman untuk transaksi backlog yang kompleks tanpa risiko kehilangan atau ketidakkonsistenan data.
