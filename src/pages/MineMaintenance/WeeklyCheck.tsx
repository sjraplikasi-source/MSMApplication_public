// ==============================================
// src/pages/MineMaintenance/WeeklyCheck.tsx
// Final Version with Sorted Weeks + KPI Summary
// ==============================================
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, getISOWeek, parseISO } from 'date-fns';
import WeeklyCheckForm from '@/components/mine/modals/WeeklyCheckForm';
import EditActualDateModal from '@/components/mine/modals/EditActualDateModal';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Loader2, Search, Download, PlusCircle, Calendar } from 'lucide-react';

// ================================
// Badge Status
// ================================
const StatusBadge = ({ status }: { status: string }) => {
  const color =
    status === '✅ Done'
      ? 'bg-green-100 text-green-700'
      : status === '❌ Missed'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';
  const label = status.replace('✅', '').replace('❌', '').replace('🕒', '').trim();
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
};

// ================================
// Main Component
// ================================
export default function WeeklyCheck() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [page, setPage] = useState(1);
  const itemsPerPage = 3;

  useEffect(() => {
    fetchWeeklyChecks();
  }, [refresh]);

  const fetchWeeklyChecks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weekly_check_schedule')
      .select(
        `
        id,
        equipment_id,
        plan_date,
        actual_date,
        interval_days,
        equipment (
          name
        )
      `
      )
      .order('plan_date', { ascending: false }); // 🔄 Terbaru ke terlama

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      const formatted = data.map((item: any) => ({
        ...item,
        equipment_name: item.equipment.name,
      }));
      setData(formatted);
    }

    setLoading(false);
  };

  const getStatus = (planDate: string, actualDate: string | null) => {
    const now = new Date();
    const plan = new Date(planDate);
    if (actualDate) return '✅ Done';
    if (now > plan) return '❌ Missed';
    return '🕒 Pending';
  };

  const handleExport = () => {
    const exportData = data.map((row) => ({
      Equipment: row.equipment_name,
      'Plan Date': format(new Date(row.plan_date), 'yyyy-MM-dd'),
      'Actual Date': row.actual_date ? format(new Date(row.actual_date), 'yyyy-MM-dd') : '',
      'Interval Days': row.interval_days ?? '',
      Status: getStatus(row.plan_date, row.actual_date)
        .replace('✅', 'Done')
        .replace('❌', 'Missed')
        .replace('🕒', 'Pending'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Check');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'weekly_check_export.xlsx');
  };

  // ================================
  // Filter & Grouping Logic
  // ================================
  const filtered = data.filter((d) => {
    const matchName = d.equipment_name.toLowerCase().includes(search.toLowerCase());
    const status = getStatus(d.plan_date, d.actual_date);
    const matchStatus =
      filterStatus === '' ||
      (filterStatus === 'done' && status.includes('Done')) ||
      (filterStatus === 'pending' && status.includes('Pending')) ||
      (filterStatus === 'missed' && status.includes('Missed'));
    const matchMonth =
      filterMonth === '' ||
      new Date(d.plan_date).getMonth() === parseInt(filterMonth);
    return matchName && matchStatus && matchMonth;
  });

  const grouped = filtered.reduce((acc: any, item: any) => {
    const week = getISOWeek(parseISO(item.plan_date));
    if (!acc[week]) acc[week] = [];
    acc[week].push(item);
    return acc;
  }, {});

  // Sort minggu terbaru dulu (descending)
  const sortedWeeks = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  const totalPages = Math.ceil(sortedWeeks.length / itemsPerPage);
  const paginatedWeeks = sortedWeeks.slice(
    (page - 1) * itemsPerPage,
    (page - 1) * itemsPerPage + itemsPerPage
  );

  // ================================
  // KPI Summary
  // ================================
  const totalDone = filtered.filter((d) => getStatus(d.plan_date, d.actual_date).includes('Done')).length;
  const totalPending = filtered.filter((d) => getStatus(d.plan_date, d.actual_date).includes('Pending')).length;
  const totalMissed = filtered.filter((d) => getStatus(d.plan_date, d.actual_date).includes('Missed')).length;

  const monthList = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Weekly Pit Stop Schedule
          </h1>
          <p className="text-gray-500 text-sm">
            Lihat jadwal mingguan berdasarkan rencana dan hasil aktual.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
          >
            <PlusCircle size={16} /> Tambah Jadwal
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <h3 className="text-green-700 font-semibold text-lg">{totalDone}</h3>
          <p className="text-green-600 text-sm">Total Done</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <h3 className="text-yellow-700 font-semibold text-lg">{totalPending}</h3>
          <p className="text-yellow-600 text-sm">Total Pending</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <h3 className="text-red-700 font-semibold text-lg">{totalMissed}</h3>
          <p className="text-red-600 text-sm">Total Missed</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border pl-8 pr-3 py-2 text-sm rounded-md w-64"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="done">✅ Done</option>
            <option value="pending">🕒 Pending</option>
            <option value="missed">❌ Missed</option>
          </select>

          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 text-gray-400" size={16} />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border rounded-md pl-8 pr-3 py-2 text-sm w-44"
            >
              <option value="">Semua Bulan</option>
              {monthList.map((month, idx) => (
                <option key={idx} value={idx.toString()}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Total Data: <span className="font-semibold">{filtered.length}</span>
        </p>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Memuat data jadwal...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          Tidak ada data yang cocok dengan filter.
        </div>
      ) : (
        paginatedWeeks.map((week) => (
          <div key={week} className="mb-8 bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
              <h2 className="font-semibold text-blue-700">
                📅 Minggu {week}
              </h2>
              <span className="text-sm text-gray-500">
                {grouped[week].length} jadwal
              </span>
            </div>
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-100">
                <tr className="text-left border-b font-medium text-gray-700">
                  <th className="p-2">Equipment</th>
                  <th className="p-2">Plan Date</th>
                  <th className="p-2">Actual Date</th>
                  <th className="p-2">Interval (days)</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped[week].map((check: any) => (
                  <tr key={check.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{check.equipment_name}</td>
                    <td className="p-2">{format(new Date(check.plan_date), 'dd/MM/yyyy')}</td>
                    <td className="p-2">
                      {check.actual_date
                        ? format(new Date(check.actual_date), 'dd/MM/yyyy')
                        : '-'}
                      <button
                        onClick={() => {
                          setEditId(check.id);
                          setEditDate(check.actual_date);
                        }}
                        className="ml-2 text-blue-600 underline text-xs"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="p-2">{check.interval_days ?? '-'}</td>
                    <td className="p-2">
                      <StatusBadge status={getStatus(check.plan_date, check.actual_date)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end mt-4 gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded ${
              page === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Prev
          </button>
          <span className="px-2 py-1">
            Halaman {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded ${
              page === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <WeeklyCheckForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setRefresh(!refresh)}
        />
      )}
      {editId && (
        <EditActualDateModal
          id={editId}
          currentDate={editDate}
          onClose={() => setEditId(null)}
          onSuccess={() => setRefresh(!refresh)}
        />
      )}
    </div>
  );
}
