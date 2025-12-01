
// =============================
// src/pages/ReportList.tsx 
// =============================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '../components/ui/data-table';
import { useMediaQuery } from 'react-responsive';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ReportList = () => {
  const navigate = useNavigate();
  const [rawData, setRawData] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortKey, setSortKey] = useState('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Fetch data from Supabase with filter/sort/pagination
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);

      let query = supabase
        .from('repair_reports')
        .select(`
          id,
          wo_number,
          equipment:equipment_id (id, name, code),
          shift,
          problem_description,
          status,
          duration,
          start_date,
          part_causing_failure,
          repair_reports_manpower (
            manpower ( name )
          )
        `, { count: 'exact' });

      // Filter Supabase query
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (equipmentFilter) {
        query = query.eq('equipment_id', equipmentFilter);
      }
      if (shiftFilter) {
        query = query.eq('shift', shiftFilter);
      }
      if (startDateFilter) {
        query = query.gte('start_date', startDateFilter);
      }
      if (endDateFilter) {
        query = query.lte('start_date', endDateFilter);
      }
      if (searchText) {
        // Hanya di kolom utama
        query = query.ilike('problem_description', `%${searchText}%`);
      }

      // Sorting
      query = query.order(sortKey === "equipment_code" ? "start_date" : sortKey, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: supaData, error, count } = await query;

      if (!error && supaData) {
        setRawData(supaData);
        setTotal(count || 0);
      }
      setLoading(false);
    };

    fetchReports();
  }, [
    statusFilter,
    equipmentFilter,
    shiftFilter,
    startDateFilter,
    endDateFilter,
    searchText, // Supabase only searches in problem_description
    sortKey,
    sortOrder,
    page,
    pageSize
  ]);

  // Search for equipment.code on frontend
  useEffect(() => {
    let result = rawData;

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(item =>
        (item.problem_description?.toLowerCase().includes(lower) ?? false) ||
        (item.equipment?.code?.toLowerCase().includes(lower) ?? false)
      );
    }

    setData(result);
  }, [rawData, searchText]);

  // Get equipment and shift options for filter
  const equipmentOptions = Array.from(
    new Set(rawData.map(d => d.equipment?.code && d.equipment.id ? `${d.equipment.id}__${d.equipment.code}` : null))
  )
    .filter(Boolean)
    .map(str => {
      const [id, code] = str!.split('__');
      return { value: id, label: code };
    });

  const shiftOptions = Array.from(
    new Set(rawData.map(d => d.shift))
  )
    .filter(Boolean)
    .map(shift => ({ value: shift, label: shift }));

  // Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const columns = [
    {
      accessorKey: 'start_date',
      header: () => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('start_date')}>
          Start Date {sortKey === 'start_date' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      enableSorting: true,
      cell: ({ row }: any) => row.original.start_date || '-',
    },
    {
      accessorKey: 'equipment_code',
      header: () => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('equipment_code')}>
          Equipment Code {sortKey === 'equipment_code' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      enableSorting: true,
      cell: ({ row }: any) => row.original.equipment?.code || '-',
    },
    {
      accessorKey: 'problem_description',
      header: () => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('problem_description')}>
          Problem Description {sortKey === 'problem_description' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      enableSorting: true,
      cell: ({ row }: any) => row.original.problem_description || '-',
    },
    {
      accessorKey: 'status',
      header: () => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
          Status {sortKey === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      enableSorting: true,
      cell: ({ row }: any) => row.original.status || '-',
    },
    {
      accessorKey: 'duration',
      header: () => (
        <span style={{ cursor: 'pointer' }} onClick={() => handleSort('duration')}>
          Duration (hrs) {sortKey === 'duration' && (sortOrder === 'asc' ? '▲' : '▼')}
        </span>
      ),
      enableSorting: true,
      cell: ({ row }: any) => {
        const val = row.original.duration;
        return val !== undefined && val !== null ? Number(val).toFixed(2) : '-';
      },
    },
    {
      accessorKey: 'manpower',
      header: 'Manpower',
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.repair_reports_manpower
          ?.map((m: any) => m.manpower?.name)
          .join(', ') || '-',
    },
{
  id: 'actions',
  header: 'Action',
  cell: ({ row }: any) => (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => navigate(`/reports/edit/${row.original.id}`)}>
        Edit
      </Button>
      <Button size="sm" onClick={() => navigate(`/reports/${row.original.id}`)}>
        Lihat Detail
      </Button>
    </div>
  ),
},

  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search problem"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
          />
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
          >
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={equipmentFilter}
            onChange={e => {
              setEquipmentFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
          >
            <option value="">All Equipment</option>
            {equipmentOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={shiftFilter}
            onChange={e => {
              setShiftFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
          >
            <option value="">All Shift</option>
            {shiftOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDateFilter}
            onChange={e => {
              setStartDateFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDateFilter}
            onChange={e => {
              setEndDateFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
            placeholder="End Date"
          />
        </div>
        <button
          onClick={() => navigate('/reports/new')}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg px-5 py-3 flex items-center gap-2 transition duration-300"
          title="Tambah Laporan"
        >
          <Plus size={20} />
          <span className="text-sm font-medium">Add Report</span>
        </button>
      </div>

      {/* PAGINATION UI */}
      <div className="flex items-center gap-4 my-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="border px-2 py-1 rounded"
        >
          Prev
        </button>
        <span>Page {page} of {Math.ceil(total / pageSize)}</span>
        <button
          onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
          disabled={page * pageSize >= total}
          className="border px-2 py-1 rounded"
        >
          Next
        </button>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        >
          {PAGE_SIZE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">Total Data: {total}</span>
      </div>

      <DataTable columns={columns} data={data} isLoading={loading} />
    </div>
  );
};

export default ReportList;
