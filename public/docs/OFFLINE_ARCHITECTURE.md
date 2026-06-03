# Offline Architecture

## 1. Purpose

Dokumen ini menjelaskan implementasi offline MSM Application yang saat ini benar-benar ada di source code.

Tujuan dokumen:

- menjelaskan bagaimana mekanisme offline saat ini bekerja
- menjelaskan alur data saat online dan saat offline
- menjelaskan arsitektur queue berbasis IndexedDB
- menjelaskan proses sinkronisasi ke Supabase
- menjelaskan keterbatasan implementasi saat ini
- menjelaskan risiko integritas data yang masih ada

Dokumen ini mencerminkan kondisi aktual repository, bukan desain target atau arsitektur ideal.

## 2. Current Offline Architecture

Implementasi offline MSM saat ini adalah write-queue sederhana berbasis browser.

Ciri utamanya:

- penyimpanan queue lokal menggunakan IndexedDB
- helper generik untuk operasi database:
  - `safeInsert()`
  - `safeUpdate()`
  - `safeDelete()`
- replay queue ke Supabase menggunakan `syncQueue()`
- sinkronisasi dipicu secara global dari `App.tsx`

Namun, coverage implementasi aktual sangat terbatas.

Yang benar-benar memakai mekanisme offline saat ini:

- `src/pages/Backlog/BacklogForm.tsx`

Yang belum benar-benar memakai mekanisme offline:

- report module
- supply module
- tool room
- mine maintenance
- operational energy
- proses update/delete apa pun

Secara praktis, implementasi offline MSM saat ini adalah:

- queue engine aktif
- replay engine aktif
- satu use case utama aktif:
  - create backlog dari `BacklogForm`

## 3. Components

## `queueDB.ts`

Lokasi:

- `src/offline/queueDB.ts`

Peran:

- membuat dan membuka IndexedDB database untuk queue offline

Implementasi aktual:

- nama database: `msm-offline-db`
- version: `1`
- object store: `queue`
- `keyPath = "id"`
- `autoIncrement = true`

Struktur data yang tersirat:

- setiap item queue memiliki `id` lokal otomatis
- item disimpan di store `queue`

Catatan:

- tidak ada store terpisah untuk attachment, retry log, atau dependency graph

## `queueService.ts`

Lokasi:

- `src/offline/queueService.ts`

Peran:

- menambahkan operasi database ke dalam queue lokal

Fungsi utama:

- `addToQueue(action, payload)`

Implementasi aktual:

- membuka IndexedDB melalui `dbPromise`
- menambahkan item baru ke store `queue`

Struktur item queue saat ini:

- `action`
- `payload`
- `created_at`

Yang tidak ada di metadata queue:

- retry count
- sync status
- last error
- parent-child dependency marker
- client-generated entity correlation ID

## `safeDb.ts`

Lokasi:

- `src/offline/safeDb.ts`

Peran:

- menjadi abstraction layer sederhana untuk write operation yang bisa berjalan online langsung atau di-queue saat offline

Fungsi utama:

- `safeInsert(table, data)`
- `safeUpdate(table, data, match)`
- `safeDelete(table, match)`

Perilaku aktual:

### `safeInsert()`

- jika online:
  - insert langsung ke Supabase
  - memakai `.select().single()`
  - mengembalikan row hasil insert
- jika offline:
  - memanggil `addToQueue("INSERT", { table, data })`
  - tidak mengembalikan row hasil insert

### `safeUpdate()`

- jika online:
  - update langsung ke Supabase
- jika offline:
  - memanggil `addToQueue("UPDATE", { table, data, match })`

### `safeDelete()`

- jika online:
  - delete langsung ke Supabase
- jika offline:
  - memanggil `addToQueue("DELETE", { table, match })`

Status pemakaian aktual:

- `safeInsert()` dipakai
- `safeUpdate()` belum dipakai
- `safeDelete()` belum dipakai

## `syncService.ts`

Lokasi:

- `src/offline/syncService.ts`

Peran:

- membaca seluruh queue lokal dan mencoba mereplay operasi ke Supabase

Fungsi utama:

- `syncQueue()`

Implementasi aktual:

1. membuka transaction `readwrite` pada object store `queue`
2. mengambil seluruh item dengan `store.getAll()`
3. memproses item satu per satu sesuai urutan hasil `getAll()`
4. mengeksekusi operasi sesuai `item.action`
5. menghapus item queue setelah operasi dijalankan
6. jika terjadi exception, loop dihentikan

Jenis replay yang didukung:

- `INSERT`
- `UPDATE`
- `DELETE`

Catatan penting:

- fungsi ini tidak memeriksa `error` dari response Supabase
- fungsi ini tidak memiliki locking/mutex untuk mencegah eksekusi paralel

## 4. Data Flow

## A. Data Flow Saat Online

Saat aplikasi online, alurnya adalah direct-write ke Supabase.

Contoh pada `BacklogForm`:

1. user mengisi form backlog
2. app melakukan validasi field wajib
3. app melakukan guard uniqueness `registration_code`
4. `safeInsert("backlogs", ...)` mendeteksi `navigator.onLine === true`
5. data dikirim langsung ke Supabase
6. hasil insert backlog dikembalikan sebagai row
7. `id` backlog digunakan untuk insert child rows:
   - `backlog_spareparts`
   - `backlog_tools`
   - `backlog_manpower`
8. child rows juga dieksekusi langsung ke Supabase

Secara ringkas:

```text
UI -> safeInsert() -> Supabase -> return inserted row -> child inserts
```

## B. Data Flow Saat Offline

Saat aplikasi offline, alurnya berubah menjadi local queue.

Contoh pada `BacklogForm`:

1. user mengisi form backlog
2. app tetap menjalankan validasi field lokal
3. registration code dibuat lokal dengan format `BL-YYYYMMDD-RAND`
4. `safeInsert("backlogs", ...)` mendeteksi `navigator.onLine === false`
5. operasi insert backlog tidak dikirim ke Supabase
6. operasi tersebut disimpan ke IndexedDB queue
7. child rows juga diproses dengan `safeInsert()`
8. child rows juga disimpan ke queue

Secara ringkas:

```text
UI -> safeInsert() -> addToQueue() -> IndexedDB queue
```

Catatan penting pada kondisi aktual:

- saat offline, `safeInsert("backlogs")` tidak mengembalikan inserted row
- akibatnya, child rows yang membutuhkan `backlog_id` tidak memiliki ID parent yang valid

## C. Data Flow Yang Masih Tetap Online-Dependent

Walaupun `BacklogForm` memiliki write queue offline, beberapa proses di page yang sama tetap online-dependent:

- pengambilan equipment options
- pengambilan backlog serupa untuk suggestion
- guard query uniqueness ke tabel `backlogs`
- upload gambar ke bucket `sparepart-images`

Artinya, offline di MSM saat ini bukan full offline feature, tetapi write fallback terbatas.

## 5. Synchronization Flow

Sinkronisasi queue dikendalikan dari `src/App.tsx`.

## Trigger yang saat ini aktif

### 1. Saat app load

- jika `navigator.onLine === true`
- `syncQueue()` langsung dipanggil

### 2. Saat browser kembali online

- `window.addEventListener("online", handleOnline)`
- `handleOnline()` memanggil `syncQueue()`

### 3. Polling periodik

- setiap 60 detik
- jika online, `syncQueue()` dipanggil

## Replay sequence

Alur sinkronisasi aktual:

```text
1. buka IndexedDB store "queue"
2. ambil semua item queue
3. loop item satu per satu
4. jalankan operasi ke Supabase berdasarkan action
5. hapus item dari queue
6. lanjut ke item berikutnya
7. jika exception terjadi, berhenti
```

## Catatan perilaku aktual

- replay bersifat global, bukan per fitur
- tidak ada visual status sync untuk user
- tidak ada retry metadata
- tidak ada dependency handling parent-child
- tidak ada locking untuk mencegah dua `syncQueue()` berjalan bersamaan

## 6. Offline Supported Features

## Supported Saat Ini

### 1. Queue lokal untuk write operation

- supported oleh:
  - `queueDB.ts`
  - `queueService.ts`

### 2. Trigger sinkronisasi saat online

- supported oleh:
  - `App.tsx`

### 3. Offline create backlog header

- supported melalui:
  - `safeInsert("backlogs", ...)`
  - `BacklogForm.tsx`

### 4. Offline queue untuk backlog child rows

- supported secara teknis melalui:
  - `safeInsert("backlog_spareparts", ...)`
  - `safeInsert("backlog_tools", ...)`
  - `safeInsert("backlog_manpower", ...)`

Catatan:

- dukungan ini ada di level queueing
- tetapi integritas relasinya tidak aman saat offline

### 5. Offline registration code fallback

- supported di:
  - `BacklogForm.tsx`

## Tidak Didukung Saat Ini

- offline read cache
- offline detail view berbasis cache lokal
- offline attachment upload
- offline update flow yang benar-benar dipakai
- offline delete flow yang benar-benar dipakai
- status queue per record di UI
- retry management
- dead-letter queue
- reconciliation logic untuk parent-child

## 7. Known Limitations

Berikut keterbatasan implementasi yang terlihat langsung dari source code.

### 1. Offline hanya aktif pada satu flow utama

- saat ini hanya `BacklogForm` yang benar-benar memakai offline queue

### 2. `safeUpdate()` dan `safeDelete()` belum dipakai

- helper tersedia, tetapi belum ada pemakaian aktual

### 3. Tidak ada local read model

- implementasi offline hanya untuk write queue
- tidak ada cache entity lokal yang bisa dibaca sebagai source of truth saat offline

### 4. Attachment tidak ikut offline flow

- gambar sparepart tetap harus diupload online

### 5. Beberapa dependency di `BacklogForm` tetap online

- equipment lookup
- duplicate suggestion
- uniqueness guard query

### 6. Tidak ada observability queue

- user tidak bisa melihat:
  - berapa item masih pending
  - item mana yang gagal sync
  - item mana yang sudah sukses

### 7. Tidak ada transaction boundary bisnis

- satu backlog dipisah menjadi beberapa queue item independen

## 8. Data Integrity Risks

## 1. Silent data loss saat replay queue

Risiko aktual:

- `syncQueue()` tidak memeriksa `error` response dari Supabase
- item queue bisa dihapus walaupun operasi database gagal

Dampak:

- perubahan hilang dari queue
- perubahan tidak sampai ke server
- user tidak mendapat sinyal kegagalan

## 2. Parent-child backlog relation bisa putus

Risiko aktual:

- `safeInsert("backlogs")` saat offline tidak mengembalikan `id`
- child rows tetap dibentuk memakai `backlog_id`

Dampak:

- `backlog_spareparts`
- `backlog_tools`
- `backlog_manpower`
- dapat tersimpan tanpa relasi valid, gagal sync, atau hilang

## 3. Partial synchronization

Risiko aktual:

- backlog dibuat sebagai beberapa operasi independen

Dampak:

- backlog header bisa masuk
- child rows bisa gagal
- data backlog menjadi tidak lengkap

## 4. Duplicate replay risk

Risiko aktual:

- `syncQueue()` bisa dipanggil dari:
  - startup
  - event `online`
  - interval 60 detik
- tidak ada guard `isSyncing`

Dampak:

- operasi yang sama bisa direplay dua kali
- terutama berbahaya untuk insert non-idempotent

## 5. Attachment mismatch

Risiko aktual:

- data backlog text bisa terqueue
- upload gambar tidak ikut queue

Dampak:

- backlog bisa tersimpan tanpa attachment yang diharapkan user

## 6. Offline uniqueness tidak kuat

Risiko aktual:

- registration code lokal hanya berbasis timestamp + random
- tidak ada rekonsiliasi uniqueness setelah sync

Dampak:

- collision kecil masih mungkin terjadi

## 9. Future Improvements

Bagian ini menjelaskan arah perbaikan yang logis berdasarkan kondisi aktual source code. Ini bukan deskripsi fitur yang sudah ada.

### 1. Tambahkan pemeriksaan `error` pada replay queue

Alasan:

- agar queue item tidak dihapus saat operasi Supabase gagal secara bisnis

### 2. Tambahkan correlation strategy untuk parent-child offline

Alasan:

- backlog offline membutuhkan cara aman untuk menghubungkan parent dan child sebelum ID server tersedia

### 3. Tambahkan sync locking

Alasan:

- mencegah dua `syncQueue()` berjalan paralel

### 4. Tambahkan queue observability

Alasan:

- user dan tim support perlu tahu status item pending/gagal

### 5. Perluas coverage offline secara bertahap

Prioritas yang paling relevan dari kondisi saat ini:

- backlog update flow
- backlog delete flow
- attachment handling
- local read cache untuk entity yang relevan

### 6. Tambahkan retry/error metadata

Alasan:

- agar item gagal tidak hilang konteksnya

### 7. Definisikan transaction boundary bisnis

Alasan:

- create backlog dengan detail resources adalah satu transaksi bisnis, tetapi saat ini dipecah menjadi queue item yang tidak saling terikat

## 10. Architecture Diagram (ASCII)

```text
                         +----------------------+
                         |      React UI        |
                         |  (BacklogForm only)  |
                         +----------+-----------+
                                    |
                                    | safeInsert()
                                    v
                         +----------------------+
                         |      safeDb.ts       |
                         |  safeInsert/Update/  |
                         |      Delete          |
                         +----+------------+----+
                              |            |
                 navigator.onLine?         |
                        YES                | NO
                              |            |
                              v            v
                   +----------------+   +------------------+
                   |   Supabase     |   | queueService.ts  |
                   | direct write   |   |  addToQueue()    |
                   +----------------+   +--------+---------+
                                                |
                                                v
                                      +----------------------+
                                      |   IndexedDB queue    |
                                      | msm-offline-db       |
                                      | store: queue         |
                                      +----------+-----------+
                                                 |
                                                 | syncQueue()
                                                 v
                                      +----------------------+
                                      |   syncService.ts     |
                                      | replay INSERT/       |
                                      | UPDATE/DELETE        |
                                      +----------+-----------+
                                                 |
                                                 v
                                      +----------------------+
                                      |      Supabase        |
                                      |   database/storage   |
                                      +----------------------+


Sync triggers from App.tsx:

- app start when online
- browser "online" event
- 60-second interval while online


Actual functional coverage:

- Offline write queue: partially active
- Offline backlog create: active
- Offline update/delete: helper exists, not used
- Offline read cache: not implemented
- Offline attachment queue: not implemented
```
