// =============================
// src/pages/Download.tsx
// =============================

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const Download = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  // State untuk indikator progress download (UX)
  const [downloadProgress, setDownloadProgress] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setDownloadProgress('Memulai pengambilan data...');
    setError(null);
    
    // Supabase limit default 1000, jadi kita ambil per batch
    const BATCH_SIZE = 1000; 
    let allData: any[] = [];
    let from = 0;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const to = from + BATCH_SIZE - 1;

        // Update status ke user biar gak dikira hang
        setDownloadProgress(`Mengambil data baris ke ${from + 1} - ${to + 1}...`);

        // Query Dasar
        let query = supabase
          .from('repair_reports')
          .select(`
            id, wo_number, problem_description,
            equipment:equipment_id(code),
            start_date, start_hour, finish_date, finish_hour,
            hour_meter,
            approved_by:approved_by_id(name),
            failure:failure_id(name),
            diagnosis:diagnosis_id(name),
            reason:reason_id(name),
            finding:finding_id(name),
            area:area_id(name),
            action:action_id(name),
            instruction:instruction_id(name),
            sub_component:sub_component_id(name),
            problems:problems_id(name),
            part_number, mechanic_comment,
            status_breakdown, activity_status, status,
            submitted_by:submitted_by(id, name),
            manpower:repair_reports_manpower(manpower:manpower_id(name)),
            duration, part_causing_failure
          `)
          .range(from, to); // <--- Teknik Pagination

        // Terapkan Filter
        if (status) query = query.eq('status', status);
        if (startDate) query = query.gte('start_date', startDate);
        if (endDate) query = query.lte('start_date', endDate);

        // Eksekusi Query Batch Ini
        const { data: batchData, error } = await query;

        if (error) throw error;

        if (batchData && batchData.length > 0) {
          // Gabungkan data baru ke array utama
          allData = [...allData, ...batchData];
          
          // Siapkan 'from' untuk loop berikutnya
          from += BATCH_SIZE;

          // Jika data yang didapat kurang dari BATCH_SIZE, berarti sudah habis
          if (batchData.length < BATCH_SIZE) {
            hasMoreData = false;
          }
        } else {
          // Tidak ada data lagi
          hasMoreData = false;
        }
      }

      // Selesai Looping
      setData(allData);
      setDownloadProgress(`Selesai! Total ${allData.length} data siap diexport.`);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (data.length === 0) {
        alert("Tidak ada data untuk diexport.");
        return;
    }

    try {
      const worksheetData = data.map((item) => ({
        'WO Number': item.wo_number || '',
        'Equipment': item.equipment?.code || '',
        'Problem Description': item.problem_description || '',
        'Start Date': item.start_date || '',
        'Start Hour': item.start_hour || '',
        'Finish Date': item.finish_date || '',
        'Finish Hour': item.finish_hour || '',
        'Duration (hours)': item.duration ?? '',
        'Hour Meter': item.hour_meter ?? '',
        'Group Leader': item.approved_by?.name || '',
        'Failure': item.failure?.name || '',
        'Diagnosis': item.diagnosis?.name || '',
        'Reason': item.reason?.name || '',
        'Finding': item.finding?.name || '',
        'Area': item.area?.name || '',
        'Action': item.action?.name || '',
        'Instruction': item.instruction?.name || '',
        'Sub Component': item.sub_component?.name || '',
        'Problem': item.problems?.name || '',
        'Part Causing Failure': item.part_causing_failure || '',
        'Part Number': item.part_number || '',
        'Mechanic Comment': item.mechanic_comment || '',
        'Status Breakdown': item.status_breakdown || '',
        'Activity Status': item.activity_status || '',
        'Status': item.status || '',
        'Submitted By': item.submitted_by?.name || item.submitted_by?.id || '',
        'Manpower': (item.manpower || []).map((m: any) => m.manpower?.name).join(', ')
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `repair_reports_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err: any) {
      console.error('Error exporting data:', err);
      setError(err.message || 'Failed to export data');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Download Laporan Breakdown</h2>
        <button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Loading...' : 'Export ke Excel'}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input type="date" className="border px-3 py-2 w-full rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" className="border px-3 py-2 w-full rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select className="border px-3 py-2 w-full rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="sm:col-span-3 text-right">
          <button
            onClick={fetchData}
            disabled={loading}
            className="mt-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sedang Memuat...' : 'Tampilkan Data'}
          </button>
        </div>
      </div>

      {/* Indikator Progress Loading */}
      {loading && (
        <div className="text-center text-blue-600 font-medium mb-4 animate-pulse p-4 bg-blue-50 rounded">
           {downloadProgress || 'Memuat data...'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && data.length === 0 ? (
        <div className="text-center py-10 text-gray-500 border-2 border-dashed rounded-lg">
            Tidak ada data ditemukan untuk filter ini.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border">
          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total records loaded: <span className="font-bold text-gray-900 text-lg">{data.length}</span>
            </p>
            {!loading && (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                    Siap Download
                </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Download;