// src/utils/exportBacklogsExcel.ts
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

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
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString() : "";
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString() : "";

/** Ambil closing paling baru untuk masing-masing backlog_id */
async function buildClosingMap(backlogIds: string[]) {
  const map = new Map<
    string,
    { closed_date?: string | null; mechanic_name?: string | null }
  >();
  if (!backlogIds.length) return map;

  const { data, error } = await supabase
    .from("backlog_closings")
    .select("backlog_id, closed_date, mechanic_name, created_at")
    .in("backlog_id", backlogIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Gagal ambil closing:", error.message);
    return map;
  }

  for (const row of data || []) {
    if (!map.has(row.backlog_id)) {
      map.set(row.backlog_id, {
        closed_date: row.closed_date ?? null,
        mechanic_name: row.mechanic_name ?? null,
      });
    }
  }
  return map;
}

/** Export semua backlog ke Excel multi-sheet, dengan kolom “Backlog Kode” di semua sheet detail. */
export async function exportBacklogsExcel(): Promise<void> {
  // 1) Ambil semua backlog + info validator
  const { data: allBacklogs, error: eB } = await supabase
    .from("backlogs")
    .select(`
      id, registration_code, unit_code, problem, date, status, priority,
      need_sparepart, need_tools, need_manpower, need_shutdown, shutdown_required,
      validated_at,
      validated_by_user:users!backlogs_validated_by_fkey(name)
    `)
    .order("date", { ascending: false });

  if (eB) throw eB;

  const backlogs = (allBacklogs || []) as BacklogRow[];
  const ids = backlogs.map((b) => b.id);
  const codeMap = new Map<string, string>(
    backlogs.map((b) => [b.id, b.registration_code || b.id])
  );
  const closingMap = await buildClosingMap(ids);

  // 2) Workbook
  const wb = XLSX.utils.book_new();

  // === Sheet 1: Backlogs (ringkasan)
  const backlogsRows = backlogs.map((b) => {
    const closing = closingMap.get(b.id);
    return [
      fmtDate(b.date),
      b.registration_code ?? "",
      b.unit_code ?? "",
      b.problem ?? "",
      b.status ?? "",
      b.priority ?? "Improve",
      b.need_sparepart ? "Ya" : "Tidak",
      b.need_tools ? "Ya" : "Tidak",
      b.need_manpower ? "Ya" : "Tidak",
      b.need_shutdown ? "Ya" : "Tidak",
      b.need_shutdown ? (b.shutdown_required ? "Ya" : "Tidak") : "",
      b.validated_by_user?.name ?? "",
      fmtDateTime(b.validated_at),
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
  XLSX.utils.book_append_sheet(wb, wsBacklogs, "Backlogs");

  if (ids.length) {
    // === Sheet 2: Spareparts
    const { data: sp } = await supabase
      .from("backlog_spareparts")
      .select(
        "backlog_id, part_number, part_name, qty, stock_status, estimated_ready_date, no_wr_pr, no_po, remarks"
      )
      .in("backlog_id", ids);
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
      ...(sp || []).map((r: any) => [
        codeMap.get(r.backlog_id) ?? r.backlog_id,
        r.part_number ?? "",
        r.part_name ?? "",
        r.qty ?? "",
        r.stock_status ?? "",
        fmtDate(r.estimated_ready_date ?? null),
        r.no_wr_pr ?? "",
        r.no_po ?? "",
        r.remarks ?? "",
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsSpares, "Spareparts");

    // === Sheet 3: Tools
    const { data: tl } = await supabase
      .from("backlog_tools")
      .select("backlog_id, tool_name, specification, qty, remarks")
      .in("backlog_id", ids);
    const wsTools = XLSX.utils.aoa_to_sheet([
      ["Backlog Kode", "Nama", "Spesifikasi", "Qty", "Remarks"],
      ...(tl || []).map((r: any) => [
        codeMap.get(r.backlog_id) ?? r.backlog_id,
        r.tool_name ?? "",
        r.specification ?? "",
        r.qty ?? "",
        r.remarks ?? "",
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsTools, "Tools");

    // === Sheet 4: Manpower
    const { data: mp } = await supabase
      .from("backlog_manpower")
      .select("backlog_id, skill_required, qty, remarks")
      .in("backlog_id", ids);
    const wsMan = XLSX.utils.aoa_to_sheet([
      ["Backlog Kode", "Skill/Nama", "Qty", "Remarks"],
      ...(mp || []).map((r: any) => [
        codeMap.get(r.backlog_id) ?? r.backlog_id,
        r.skill_required ?? "",
        r.qty ?? "",
        r.remarks ?? "",
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsMan, "Manpower");

    // === Sheet 5: Shutdown
    const { data: sd } = await supabase
      .from("backlog_shutdown")
      .select("backlog_id, activity_name, qty, remarks")
      .in("backlog_id", ids);
    const wsShutdown = XLSX.utils.aoa_to_sheet([
      ["Backlog Kode", "Aktivitas", "Qty", "Remarks"],
      ...(sd || []).map((r: any) => [
        codeMap.get(r.backlog_id) ?? r.backlog_id,
        r.activity_name ?? "",
        r.qty ?? "",
        r.remarks ?? "",
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsShutdown, "Shutdown");

    // === Sheet 6: Closing
    const closingRows = Array.from(closingMap.entries()).map(
      ([backlogId, c]) => [
        codeMap.get(backlogId) ?? backlogId,
        fmtDate(c.closed_date ?? null),
        c.mechanic_name ?? "",
      ]
    );
    const wsClosing = XLSX.utils.aoa_to_sheet([
      ["Backlog Kode", "Tanggal Close", "Nama Mekanik"],
      ...closingRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsClosing, "Closing");
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  XLSX.writeFile(wb, `Backlogs_${y}-${m}-${d}.xlsx`);
}
