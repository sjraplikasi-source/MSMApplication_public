import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import WeeklyCheckForm from '@/components/mine/modals/WeeklyCheckForm';
import EditActualDateModal from '@/components/mine/modals/EditActualDateModal';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface WeeklyCheck {
  id: string;
  equipment_id: string;
  plan_date: string;
  actual_date: string | null;
  interval_days: number | null;
  equipment_name: string;
}

export default function WeeklyCheck() {
  const [data, setData] = useState<WeeklyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);

  useEffect(() => {
    fetchWeeklyChecks();
  }, [refresh]);

  const fetchWeeklyChecks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weekly_check_schedule')
      .select(`
        id,
        equipment_id,
        plan_date,
        actual_date,
        interval_days,
        equipment (
          name
        )
      `)
      .order('plan_date', { ascending: true });

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Weekly Pit Stop Schedule</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            + Tambah Jadwal
          </button>
          <button
            onClick={handleExport}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
          >
            Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow rounded p-4 overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left border-b font-medium">
                <th className="p-2">Equipment</th>
                <th className="p-2">Plan Date</th>
                <th className="p-2">Actual Date</th>
                <th className="p-2">Interval (days)</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((check) => (
                <tr key={check.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{check.equipment_name}</td>
                  <td className="p-2">{format(new Date(check.plan_date), 'dd/MM/yyyy')}</td>
                  <td className="p-2">
                    {check.actual_date ? format(new Date(check.actual_date), 'dd/MM/yyyy') : '-'}
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
                  <td className="p-2">{getStatus(check.plan_date, check.actual_date)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    Tidak ada jadwal pit stop.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
