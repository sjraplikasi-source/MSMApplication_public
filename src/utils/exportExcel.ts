// src/utils/exportBacklogsExcel.ts
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

type UUID = string;

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString();
};
const yesno = (b?: boolean | null) => (b ? 'Ya' : 'Tidak');

export async function exportBacklogsExcel() {
  // ---- Backlogs (utama)
  const { data: backlogs, error: e1 } = await supabase
    .from('backlogs')
    .select(
      'id, registration_code, unit_code, date, problem, status, ' +
      'need_sparepart, need_tools, need_manpower, need_shutdown, shutdown_required, ' +
      'validated_by, validated_at'
    )
    .order('date', { ascending: false });

  if (e1) throw new Error('Gagal ambil backlogs: ' + e1.message);
  const base = backlogs || [];
  if (!base.length) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tidak ada data']]), 'Backlogs');
    XLSX.writeFile(wb, `Backlog_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return;
  }

  const idToCode = new Map<UUID, string>(base.map((b: any) => [b.id, b.registration_code || '']));
  const backlogIds = base.map((b: any) => b.id).filter(Boolean);

  // Validator map
  const validatorIds = Array.from(new Set(base.map((b: any) => b.validated_by).filter(Boolean))) as UUID[];
  let validatorMap = new Map<UUID, string>();
  if (validatorIds.length) {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name')
      .in('id', validatorIds);
    if (error) throw new Error('Gagal ambil validator: ' + error.message);
    validatorMap = new Map(users!.map((u: any) => [u.id as UUID, u.name || '']));
  }

  // Detail
  const [{ data: sp, error: eSp }, { data: tl, error: eTl }, { data: mp, error: eMp }] = await Promise.all([
    supabase
      .from('backlog_spareparts')
      .select('backlog_id, part_number, part_name, qty, stock_status, estimated_ready_date, no_wr_pr, no_po, remarks')
      .in('backlog_id', backlogIds),
    supabase
      .from('backlog_tools')
      .select('backlog_id, tool_name, specification, qty, remarks')
      .in('backlog_id', backlogIds),
    supabase
      .from('backlog_manpower')
      .select('backlog_id, skill_required, qty, remarks')
      .in('backlog_id', backlogIds),
  ]);
  if (eSp) throw new Error('Gagal ambil spareparts: ' + eSp.message);
  if (eTl) throw new Error('Gagal ambil tools: ' + eTl.message);
  if (eMp) throw new Error('Gagal ambil manpower: ' + eMp.message);

  // Closing
  const { data: closing, error: eCl } = await supabase
    .from('backlog_closings')
    .select('backlog_id, closed_date, mechanic_name')
    .in('backlog_id', backlogIds);
  if (eCl) throw new Error('Gagal ambil closing: ' + eCl.message);
  const closingMap = new Map<UUID, any>((closing || []).map((c: any) => [c.backlog_id as UUID, c]));

  // ==== Workbook ====
  const wb = XLSX.utils.book_new();

  // Backlogs (ringkasan) – pakai AOA supaya header fix
  const BACK_HEADERS = [
    'Tanggal', 'Kode', 'Unit', 'Problem', 'Status',
    'Butuh Sparepart', 'Butuh Tools', 'Butuh Manpower', 'Butuh Shutdown', 'Shutdown Required',
    'Validator', 'Tanggal Validasi', 'Tanggal Close', 'Nama Mekanik (Closing)',
  ];
  const backRows = base.map((b: any) => ([
    fmtDate(b.date),
    b.registration_code || '',
    b.unit_code || '',
    b.problem || '',
    b.status || '',
    yesno(b.need_sparepart),
    yesno(b.need_tools),
    yesno(b.need_manpower),
    yesno(b.need_shutdown),
    yesno(b.shutdown_required),
    b.validated_by ? (validatorMap.get(b.validated_by) || '') : '',
    fmtDate(b.validated_at),
    fmtDate(closingMap.get(b.id)?.closed_date || null),
    closingMap.get(b.id)?.mechanic_name || '',
  ]));
  const shBack = XLSX.utils.aoa_to_sheet([BACK_HEADERS, ...backRows]);
  XLSX.utils.book_append_sheet(wb, shBack, 'Backlogs');

  // Spareparts — kolom pertama pasti "Backlog Kode"
  const SP_HEADERS = [
    'Backlog Kode', 'Part Number', 'Part Name', 'Qty', 'Stock Status',
    'Est. Ready', 'No WR/PR', 'No PO', 'Remarks',
  ];
  const spRows = (sp || []).map((r: any) => ([
    idToCode.get(r.backlog_id) || '',
    r.part_number || '',
    r.part_name || '',
    r.qty ?? '',
    r.stock_status || '',
    fmtDate(r.estimated_ready_date),
    r.no_wr_pr || '',
    r.no_po || '',
    r.remarks || '',
  ]));
  const shSp = XLSX.utils.aoa_to_sheet([SP_HEADERS, ...spRows]);
  XLSX.utils.book_append_sheet(wb, shSp, 'Spareparts');

  // Tools — kolom pertama "Backlog Kode"
  const TL_HEADERS = ['Backlog Kode', 'Nama', 'Spesifikasi', 'Qty', 'Remarks'];
  const tlRows = (tl || []).map((r: any) => ([
    idToCode.get(r.backlog_id) || '',
    r.tool_name || '',
    r.specification || '',
    r.qty ?? '',
    r.remarks || '',
  ]));
  const shTl = XLSX.utils.aoa_to_sheet([TL_HEADERS, ...tlRows]);
  XLSX.utils.book_append_sheet(wb, shTl, 'Tools');

  // Manpower — kolom pertama "Backlog Kode"
  const MP_HEADERS = ['Backlog Kode', 'Skill/Nama', 'Qty', 'Remarks'];
  const mpRows = (mp || []).map((r: any) => ([
    idToCode.get(r.backlog_id) || '',
    r.skill_required || '',
    r.qty ?? '',
    r.remarks || '',
  ]));
  const shMp = XLSX.utils.aoa_to_sheet([MP_HEADERS, ...mpRows]);
  XLSX.utils.book_append_sheet(wb, shMp, 'Manpower');

  // Shutdown (opsional, ringkas) — kolom pertama "Backlog Kode"
  const SD_HEADERS = ['Backlog Kode', 'Aktivitas', 'Qty', 'Remarks'];
  const sdRows = base
    .filter((b: any) => b.need_shutdown)
    .map((b: any) => ([
      b.registration_code || '',
      b.problem || '',
      1,
      '',
    ]));
  const shSd = XLSX.utils.aoa_to_sheet([SD_HEADERS, ...sdRows]);
  XLSX.utils.book_append_sheet(wb, shSd, 'Shutdown');

  // Closing — kolom pertama "Backlog Kode"
  const CL_HEADERS = ['Backlog Kode', 'Tanggal Close', 'Nama Mekanik'];
  const clRows = (closing || []).map((c: any) => ([
    idToCode.get(c.backlog_id) || '',
    fmtDate(c.closed_date),
    c.mechanic_name || '',
  ]));
  const shCl = XLSX.utils.aoa_to_sheet([CL_HEADERS, ...clRows]);
  XLSX.utils.book_append_sheet(wb, shCl, 'Closing');

  XLSX.writeFile(wb, `Backlog_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
