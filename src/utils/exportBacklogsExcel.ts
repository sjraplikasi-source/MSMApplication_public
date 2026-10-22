// src/utils/exportBacklogsExcel.ts

import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

// ============================================================
// TYPES
// ============================================================

type BacklogRow = {
  id: string;
  registration_code: string | null;
  unit_code: string | null;
  problem: string | null;
  date: string | null;
  status: string | null;
  priority: string | null;
  need_sparepart?: boolean | null;
  need_tools?: boolean | null;
  need_manpower?: boolean | null;
  need_shutdown?: boolean | null;
  shutdown_required?: boolean | null;
  validated_at?: string | null;
  validated_by_user?: { name?: string | null } | null;
  created_by_user?: { name?: string | null } | null;
};

type ClosingRow = {
  backlog_id: string;
  closed_date: string | null;
  mechanic_name: string | null;
  created_at: string | null;
};

type SparepartRow = {
  backlog_id: string;
  part_number: string | null;
  part_name: string | null;
  qty: number | null;
  stock_status: string | null;
  estimated_ready_date: string | null;
  no_wr_pr: string | null;
  no_po: string | null;
  remarks: string | null;
};

type ToolRow = {
  backlog_id: string;
  tool_name: string | null;
  specification: string | null;
  qty: number | null;
  remarks: string | null;
};

type ManpowerRow = {
  backlog_id: string;
  skill_required: string | null;
  qty: number | null;
  remarks: string | null;
};

type ShutdownRow = {
  backlog_id: string;
  activity_name: string | null;
  qty: number | null;
  remarks: string | null;
};

// ============================================================
// CONFIGURATION
// ============================================================

// Maksimal 100 backlog ID per query detail.
const EXPORT_BATCH_SIZE = 100;

// Pengambilan daftar backlog dilakukan per 500 baris.
const BACKLOG_PAGE_SIZE = 500;

// ============================================================
// DATE FORMAT
// ============================================================

const fmtDate = (value?: string | null): string => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString();
};

const fmtDateTime = (value?: string | null): string => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString();
};

// ============================================================
// FETCH DETAIL DATA IN BATCHES
// ============================================================

/**
 * Mengambil data berdasarkan daftar backlog ID secara bertahap.
 *
 * Jika salah satu query gagal, proses export dihentikan
 * agar file Excel tidak dibuat dengan data yang tidak lengkap.
 */
async function fetchInBatches<T>(
  label: string,
  ids: string[],
  fetchBatch: (batchIds: string[]) => PromiseLike<any>
): Promise<T[]> {
  const result: T[] = [];

  if (ids.length === 0) {
    return result;
  }

  const totalBatches = Math.ceil(
    ids.length / EXPORT_BATCH_SIZE
  );

  for (
    let offset = 0;
    offset < ids.length;
    offset += EXPORT_BATCH_SIZE
  ) {
    const batchIds = ids.slice(
      offset,
      offset + EXPORT_BATCH_SIZE
    );

    const batchNumber =
      Math.floor(offset / EXPORT_BATCH_SIZE) + 1;

    const { data, error } = await fetchBatch(batchIds);

    if (error) {
      console.error(`Gagal mengambil ${label}:`, {
        batch: batchNumber,
        totalBatches,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      throw new Error(
        `Gagal export ${label}, batch ${batchNumber}/${totalBatches}: ` +
        `${error.message || "Unknown Supabase error"}`
      );
    }

    const batchData = (data ?? []) as T[];

    result.push(...batchData);
  }

  console.info(
    `Export ${label}: ${result.length} records dari ${ids.length} backlog ID`
  );

  return result;
}

// ============================================================
// FETCH ALL BACKLOGS WITH PAGINATION
// ============================================================

/**
 * Mengambil seluruh backlog, bukan hanya halaman pertama
 * yang dikembalikan oleh Supabase.
 */
async function fetchAllBacklogs(): Promise<BacklogRow[]> {
  const allBacklogs: BacklogRow[] = [];

  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("backlogs")
      .select(`
        id,
        registration_code,
        unit_code,
        problem,
        date,
        status,
        priority,
        need_sparepart,
        need_tools,
        need_manpower,
        need_shutdown,
        shutdown_required,
        validated_at,
        created_by_user:users!backlogs_created_by_fkey(name),
        validated_by_user:users!backlogs_validated_by_fkey(name)
      `)
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(
        offset,
        offset + BACKLOG_PAGE_SIZE - 1
      );

    if (error) {
      console.error("Gagal mengambil daftar backlog:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        offset,
      });

      throw new Error(
        `Gagal mengambil daftar backlog: ${error.message}`
      );
    }

    const pageRows = (data ?? []) as unknown as BacklogRow[];

    if (pageRows.length === 0) {
      break;
    }

    allBacklogs.push(...pageRows);

    offset += pageRows.length;

    if (pageRows.length < BACKLOG_PAGE_SIZE) {
      break;
    }
  }

  console.info(
    `Total backlog berhasil diambil: ${allBacklogs.length}`
  );

  return allBacklogs;
}

// ============================================================
// BUILD CLOSING MAP
// ============================================================

/**
 * Mengambil closing terbaru untuk setiap backlog_id.
 */
async function buildClosingMap(
  backlogIds: string[]
): Promise<
  Map<
    string,
    {
      closed_date: string | null;
      mechanic_name: string | null;
    }
  >
> {
  const map = new Map<
    string,
    {
      closed_date: string | null;
      mechanic_name: string | null;
    }
  >();

  if (backlogIds.length === 0) {
    return map;
  }

  const closingRows = await fetchInBatches<ClosingRow>(
    "Closing",
    backlogIds,
    (batchIds) =>
      supabase
        .from("backlog_closings")
        .select(
          "backlog_id, closed_date, mechanic_name, created_at"
        )
        .in("backlog_id", batchIds)
        .order("created_at", { ascending: false })
  );

  // Setiap batch memiliki daftar backlog ID yang berbeda.
  // Dalam satu batch, closing telah diurutkan terbaru dahulu.
  for (const row of closingRows) {
    if (!map.has(row.backlog_id)) {
      map.set(row.backlog_id, {
        closed_date: row.closed_date ?? null,
        mechanic_name: row.mechanic_name ?? null,
      });
    }
  }

  return map;
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

/**
 * Export seluruh backlog ke Excel multi-sheet.
 *
 * Sheets:
 * 1. Backlogs
 * 2. Spareparts
 * 3. Tools
 * 4. Manpower
 * 5. Shutdown
 * 6. Closing
 */
export async function exportBacklogsExcel(): Promise<void> {
  console.info("Memulai export Backlog ke Excel...");

  // ----------------------------------------------------------
  // 1. Ambil seluruh backlog
  // ----------------------------------------------------------

  const backlogs = await fetchAllBacklogs();

  const ids = backlogs.map((backlog) => backlog.id);

  const codeMap = new Map<string, string>(
    backlogs.map(
      (backlog) =>
        [
          backlog.id,
          backlog.registration_code || backlog.id,
        ] as [string, string]
    )
  );

  // ----------------------------------------------------------
  // 2. Ambil closing terbaru
  // ----------------------------------------------------------

  const closingMap = await buildClosingMap(ids);

  // ----------------------------------------------------------
  // 3. Buat workbook
  // ----------------------------------------------------------

  const wb = XLSX.utils.book_new();

  // ==========================================================
  // SHEET 1: BACKLOGS
  // ==========================================================

  const backlogsRows = backlogs.map((backlog) => {
    const closing = closingMap.get(backlog.id);

    return [
      fmtDate(backlog.date),
      backlog.registration_code ?? "",
      backlog.unit_code ?? "",
      backlog.problem ?? "",
      backlog.status ?? "",
      backlog.priority ?? "Improve",
      backlog.created_by_user?.name ?? "",
      backlog.need_sparepart ? "Ya" : "Tidak",
      backlog.need_tools ? "Ya" : "Tidak",
      backlog.need_manpower ? "Ya" : "Tidak",
      backlog.need_shutdown ? "Ya" : "Tidak",
      backlog.need_shutdown
        ? backlog.shutdown_required
          ? "Ya"
          : "Tidak"
        : "",
      backlog.validated_by_user?.name ?? "",
      fmtDateTime(backlog.validated_at),
      fmtDate(closing?.closed_date ?? null),
      closing?.mechanic_name ?? "",
    ];
  });

  const wsBacklogs = XLSX.utils.aoa_to_sheet([
    [
      "Tanggal",
      "Kode",
      "Unit",
      "Problem",
      "Status",
      "Prioritas",
      "Input By",
      "Butuh Sparepart",
      "Butuh Tools",
      "Butuh Manpower",
      "Butuh Shutdown",
      "Shutdown Required",
      "Validator",
      "Tanggal Validasi",
      "Tanggal Close",
      "Nama Mekanik (Closing)",
    ],
    ...backlogsRows,
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsBacklogs,
    "Backlogs"
  );

  // ==========================================================
  // SHEET DETAIL
  // ==========================================================

  // Buat semua sheet detail meskipun belum ada backlog ID.
  // Untuk daftar kosong, sheet akan berisi header saja.

  // ----------------------------------------------------------
  // SHEET 2: SPAREPARTS
  // ----------------------------------------------------------

  const spareparts = await fetchInBatches<SparepartRow>(
    "Spareparts",
    ids,
    (batchIds) =>
      supabase
        .from("backlog_spareparts")
        .select(`
          backlog_id,
          part_number,
          part_name,
          qty,
          stock_status,
          estimated_ready_date,
          no_wr_pr,
          no_po,
          remarks
        `)
        .in("backlog_id", batchIds)
  );

  const wsSpares = XLSX.utils.aoa_to_sheet([
    [
      "Backlog Kode",
      "Part Number",
      "Part Name",
      "Qty",
      "Stock Status",
      "Est. Ready",
      "No WR/PR",
      "No PO",
      "Remarks",
    ],
    ...spareparts.map((row) => [
      codeMap.get(row.backlog_id) ?? row.backlog_id,
      row.part_number ?? "",
      row.part_name ?? "",
      row.qty ?? "",
      row.stock_status ?? "",
      fmtDate(row.estimated_ready_date),
      row.no_wr_pr ?? "",
      row.no_po ?? "",
      row.remarks ?? "",
    ]),
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsSpares,
    "Spareparts"
  );

  // ----------------------------------------------------------
  // SHEET 3: TOOLS
  // ----------------------------------------------------------

  const tools = await fetchInBatches<ToolRow>(
    "Tools",
    ids,
    (batchIds) =>
      supabase
        .from("backlog_tools")
        .select(`
          backlog_id,
          tool_name,
          specification,
          qty,
          remarks
        `)
        .in("backlog_id", batchIds)
  );

  const wsTools = XLSX.utils.aoa_to_sheet([
    [
      "Backlog Kode",
      "Nama",
      "Spesifikasi",
      "Qty",
      "Remarks",
    ],
    ...tools.map((row) => [
      codeMap.get(row.backlog_id) ?? row.backlog_id,
      row.tool_name ?? "",
      row.specification ?? "",
      row.qty ?? "",
      row.remarks ?? "",
    ]),
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsTools,
    "Tools"
  );

  // ----------------------------------------------------------
  // SHEET 4: MANPOWER
  // ----------------------------------------------------------

  const manpower = await fetchInBatches<ManpowerRow>(
    "Manpower",
    ids,
    (batchIds) =>
      supabase
        .from("backlog_manpower")
        .select(`
          backlog_id,
          skill_required,
          qty,
          remarks
        `)
        .in("backlog_id", batchIds)
  );

  const wsManpower = XLSX.utils.aoa_to_sheet([
    [
      "Backlog Kode",
      "Skill/Nama",
      "Qty",
      "Remarks",
    ],
    ...manpower.map((row) => [
      codeMap.get(row.backlog_id) ?? row.backlog_id,
      row.skill_required ?? "",
      row.qty ?? "",
      row.remarks ?? "",
    ]),
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsManpower,
    "Manpower"
  );

  // ----------------------------------------------------------
  // SHEET 5: SHUTDOWN
  // ----------------------------------------------------------

  const shutdown = await fetchInBatches<ShutdownRow>(
    "Shutdown",
    ids,
    (batchIds) =>
      supabase
        .from("backlog_shutdown")
        .select(`
          backlog_id,
          activity_name,
          qty,
          remarks
        `)
        .in("backlog_id", batchIds)
  );

  const wsShutdown = XLSX.utils.aoa_to_sheet([
    [
      "Backlog Kode",
      "Aktivitas",
      "Qty",
      "Remarks",
    ],
    ...shutdown.map((row) => [
      codeMap.get(row.backlog_id) ?? row.backlog_id,
      row.activity_name ?? "",
      row.qty ?? "",
      row.remarks ?? "",
    ]),
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsShutdown,
    "Shutdown"
  );

  // ----------------------------------------------------------
  // SHEET 6: CLOSING
  // ----------------------------------------------------------

  const closingRows = Array.from(
    closingMap.entries()
  ).map(([backlogId, closing]) => [
    codeMap.get(backlogId) ?? backlogId,
    fmtDate(closing.closed_date),
    closing.mechanic_name ?? "",
  ]);

  const wsClosing = XLSX.utils.aoa_to_sheet([
    [
      "Backlog Kode",
      "Tanggal Close",
      "Nama Mekanik",
    ],
    ...closingRows,
  ]);

  XLSX.utils.book_append_sheet(
    wb,
    wsClosing,
    "Closing"
  );

  // ----------------------------------------------------------
  // 4. Download Excel
  // ----------------------------------------------------------

  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const fileName = `Backlogs_${year}-${month}-${day}.xlsx`;

  XLSX.writeFile(wb, fileName);

  console.info("Export berhasil:", {
    fileName,
    totalBacklogs: backlogs.length,
    totalSpareparts: spareparts.length,
    totalTools: tools.length,
    totalManpower: manpower.length,
    totalShutdown: shutdown.length,
    totalClosing: closingRows.length,
  });
}
