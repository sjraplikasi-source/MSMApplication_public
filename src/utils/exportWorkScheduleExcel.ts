// src/utils/exportWorkScheduleExcel.ts
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const exportWorkScheduleExcel = async () => {
  try {
    // 1. Ambil semua backlog yang berstatus 'dijadwalkan' dengan data relasi yang lengkap
    const { data, error } = await supabase
      .from('backlogs')
      .select(`
        *,
        created_by:users!backlogs_created_by_fkey(name),
        scheduled_by:users!backlogs_scheduled_by_fkey(name),
        spareparts:backlog_spareparts(*),
        tools:backlog_tools(*),
        additional_manpower:backlog_manpower(*),
        assigned_mechanics:backlog_assignments(manpower(name, nrp))
      `)
      .eq('status', 'dijadwalkan')
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      alert("Tidak ada data jadwal kerja untuk diunduh.");
      return;
    }

    // 2. Proses data agar menjadi format yang mudah dibaca di Excel
    const worksheetData = data.map(item => ({
      'Tanggal Jadwal': item.scheduled_date ? format(new Date(item.scheduled_date), 'dd-MMM-yyyy') : '',
      'Kode Registrasi': item.registration_code,
      'Unit': item.unit_code,
      'Problem': item.problem,
      'Mekanik Bertugas': item.assigned_mechanics.map(m => m.manpower.name).join(',\n'),
      'Catatan Eksekusi': item.execution_notes,
      'Dijadwalkan Oleh': item.scheduled_by?.name,
      'Tanggal Lapor': item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '',
      'Dibuat Oleh': item.created_by?.name,
      'Butuh Sparepart': item.need_sparepart ? 'Ya' : 'Tidak',
      'Daftar Sparepart': item.spareparts.map(p => `${p.part_name} (Qty: ${p.qty})`).join(';\n'),
      'Butuh Tools': item.need_tools ? 'Ya' : 'Tidak',
      'Daftar Tools': item.tools.map(t => `${t.tool_name} (Qty: ${t.qty})`).join(';\n'),
      'Butuh Manpower Tambahan': item.need_manpower ? 'Ya' : 'Tidak',
      'Manpower Tambahan': item.additional_manpower.map(m => `${m.skill_required} (Qty: ${m.qty})`).join(';\n'),
      'Butuh Shutdown': item.need_shutdown ? 'Ya' : 'Tidak',
    }));

    // 3. Buat file Excel
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Kerja');

    // Atur lebar kolom agar rapi
    const colWidths = Object.keys(worksheetData[0]).map(key => ({
        wch: Math.max(key.length, ...worksheetData.map(row => (row[key] || "").toString().split('\n')[0].length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    // 4. Unduh file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `jadwal_kerja_backlog_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

  } catch (err: any) {
    console.error("Error exporting work schedule to Excel:", err);
    throw new Error(err.message || 'Gagal membuat file Excel.');
  }
};
