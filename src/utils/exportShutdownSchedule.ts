// src/utils/exportShutdownSchedule.ts
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const exportShutdownSchedule = async (shutdownEventId: string, eventTitle: string) => {
  try {
    // 1. Ambil semua backlog yang tertaut ke event shutdown ini
    const { data, error } = await supabase
      .from('backlogs')
      .select(`
        problem, unit_code, scheduled_date,
        assigned_mechanics:backlog_assignments(manpower(name)),
        additional_manpower:backlog_manpower(skill_required, qty),
        tools:backlog_tools(tool_name, qty)
      `)
      .eq('shutdown_event_id', shutdownEventId)
      .eq('status', 'dijadwalkan')
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      alert(`Tidak ada pekerjaan yang dijadwalkan untuk event shutdown "${eventTitle}".`);
      return;
    }

    // 2. Proses data agar formatnya menyerupai contoh Excel Anda
    const worksheetData = data.map((item, index) => ({
      'No.': index + 1,
      'Activity (Problem)': item.problem,
      'Unit': item.unit_code,
      'Tanggal': item.scheduled_date ? format(new Date(item.scheduled_date), 'dd-MMM-yyyy') : '',
      'Manpower Allocation': item.assigned_mechanics.map(m => m.manpower.name).join(', '),
      'Tools': item.tools.map(t => `${t.tool_name} (Qty: ${t.qty})`).join(', '),
      'Manpower Need': item.additional_manpower.map(m => `${m.skill_required} (Qty: ${m.qty})`).join(', '),
      'Remarks': '', // Kolom kosong untuk diisi manual jika perlu
    }));

    // 3. Buat file Excel
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Shutdown');

    // Atur lebar kolom
    worksheet['!cols'] = [
        { wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, 
        { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 20 }
    ];

    // 4. Unduh file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `Schedule-${eventTitle.replace(/ /g, '_')}-${format(new Date(), 'yyyyMMdd')}.xlsx`;
    saveAs(blob, fileName);

  } catch (err: any) {
    console.error("Error exporting shutdown schedule:", err);
    throw new Error(err.message || 'Gagal membuat file Excel.');
  }
};
