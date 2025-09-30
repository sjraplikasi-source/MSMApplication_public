// src/pages/Backlog/BacklogList.tsx (LENGKAP & DIPERBAIKI)

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportBacklogsExcel } from "@/utils/exportBacklogsExcel";
import BacklogTable from '../../components/BacklogTable'; // Menggunakan path relatif yang sudah benar

// --- Tipe Data ---
type UUID = string;
type BacklogSparepart = { stock_status: string | null; estimated_ready_date: string | null; };
type BacklogRow = {
  id: UUID;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string | null;
  status: string | null;
  supply_updated_at: string | null;
  backlog_spareparts: BacklogSparepart[];
  created_by: { name: string | null; } | null;
  need_sparepart: boolean;
  need_tools: boolean;
  need_manpower: boolean;
  need_shutdown: boolean;
  priority: 'High' | 'Medium' | 'Low' | 'Improve' | null;
};
type SortBy = "date" | "unit_code" | "registration_code" | "problem" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const STATUS_OPTIONS = ["all", "open", "draft", "validated", "reviewed", "closed", "rejected"] as const;
const PART_STATUS_OPTIONS = ["all", "complete", "waiting"] as const;
const SHUTDOWN_OPTIONS = ["all", "true", "false"] as const;

// --- Komponen Status ---
const SupplyStatusBadge: React.FC<{ backlog: BacklogRow }> = ({ backlog }) => {
  const statusResult = useMemo(() => {
    if (!backlog.need_sparepart) return { text: "Tanpa Part", color: "bg-gray-100 text-gray-700 border border-gray-200" };
    if (!backlog.supply_updated_at) return { text: "Perlu Update", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    const parts = backlog.backlog_spareparts || [];
    if (parts.length === 0) return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isOverdue = parts.some(part => part.estimated_ready_date && new Date(part.estimated_ready_date) < today);
    if (isOverdue) return { text: "Perlu Update Estimasi", color: "bg-red-50 text-red-700 border border-red-200" };
    const readyParts = parts.filter(p => p.stock_status?.toLowerCase() === 'ready').length;
    if (parts.length > 0 && readyParts === parts.length) return { text: "Semua Part Ready", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    if (readyParts > 0) return { text: "Ready Parsial", color: "bg-purple-50 text-purple-700 border border-purple-200" };
    return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };
  }, [backlog]);
  return <span className={`px-2 py-1 text-xs rounded-full ${statusResult.color}`}>{statusResult.text}</span>;
};

const BacklogList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [partStatus, setPartStatus] = useState<(typeof PART_STATUS_OPTIONS)[number]>("all");
  const [needShutdown, setNeedShutdown] = useState<(typeof SHUTDOWN_OPTIONS)[number]>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get('q') || '');
    setStatus((params.get('status') as any) || 'all');
    setPartStatus((params.get('part_status') as any) || 'all');
    setNeedShutdown((params.get('need_shutdown') as any) || 'all');
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const params = new URLSearchParams(location.search);
        const statusFilter = params.get('status') || 'all';
        const qFilter = params.get('q') || '';
        const needShutdownFilter = params.get('need_shutdown');
        const partStatusFilter = params.get('part_status') || 'all';

        let query = supabase
          .from("backlogs")
          .select(
            `id, registration_code, unit_code, problem, date, status, supply_updated_at, created_by(name), need_sparepart, need_tools, need_manpower, need_shutdown, backlog_spareparts(stock_status), priority`,
            { count: "exact" }
          );

        if (qFilter) { query = query.or(`registration_code.ilike.%${qFilter}%,unit_code.ilike.%${qFilter}%,problem.ilike.%${qFilter}%`); }
        if (statusFilter !== "all") {
            if (statusFilter === 'open') { query = query.not('status', 'in', '("closed", "rejected")'); }
            else { query = query.eq("status", statusFilter); }
        }
        if (needShutdownFilter === 'true') { query = query.is('need_shutdown', true); }
        if (needShutdownFilter === 'false') { query = query.is('need_shutdown', false); }

        query = query.order(sortBy, { ascending: sortDir === "asc" });
        
        const { data, error } = await query;
        if (error) throw error;

        let finalData = (data as BacklogRow[]) || [];

        if (partStatusFilter !== 'all') {
          finalData = finalData.filter(b => {
            if (partStatusFilter === 'complete') {
              return !b.need_sparepart || (b.backlog_spareparts.length > 0 && b.backlog_spareparts.every(p => p.stock_status?.toLowerCase() === 'ready'));
            }
            if (partStatusFilter === 'waiting') {
              return b.need_sparepart && (b.backlog_spareparts.length === 0 || b.backlog_spareparts.some(p => p.stock_status?.toLowerCase() !== 'ready'));
            }
            return true;
          });
        }

        setTotal(finalData.length);
        setRows(finalData.slice(from, to + 1));
      } catch (e: any) {
        setError(e?.message || "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [location.search, page, pageSize, sortBy, sortDir]);

  const updateUrlFilters = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status !== 'all') params.set('status', status);
    if (partStatus !== 'all') params.set('part_status', partStatus);
    if (needShutdown !== 'all') params.set('need_shutdown', needShutdown);
    navigate(`?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const onReset = () => { navigate('/Backlog/list'); };
  const downloadExcelFull = async () => { await exportBacklogsExcel(); };

  const tableColumns = useMemo(() => [
    { key: 'date', header: 'Tanggal', render: (row: BacklogRow) => row.date ? new Date(row.date).toLocaleDateString() : "-" },
    { key: 'registration_code', header: 'Kode', render: (row: BacklogRow) => row.registration_code || "-" },
    { key: 'unit_code', header: 'Unit', render: (row: BacklogRow) => row.unit_code },
    { key: 'problem', header: 'Problem', render: (row: BacklogRow) => <div className="line-clamp-2">{row.problem}</div> },
    { key: 'priority', header: 'Prioritas', render: (row: BacklogRow) => <span className="font-medium">{row.priority || ''}</span> },
    { key: 'created_by', header: 'Dibuat Oleh', render: (row: BacklogRow) => row.created_by?.name || "-" },
    { key: 'progress_sm', header: 'Progress SM', render: (row: BacklogRow) => <SupplyStatusBadge backlog={row} /> },
    { key: 'status', header: 'Status', render: (row: BacklogRow) => row.status || "-" },
    { key: 'detail', header: 'Detail', render: (row: BacklogRow) => <Link to={`/Backlog/detail/${row.id}`} className="text-blue-600 hover:underline">Lihat</Link> },
  ], []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Daftar Backlog</h2>
        <button onClick={downloadExcelFull} disabled={downloading} className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50">
          {downloading ? "Menyiapkan..." : "Download Excel"}
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input className="w-full border rounded px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status Backlog</label>
            <select className="w-full border rounded px-3 py-2 bg-white" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status Part</label>
            <select className="w-full border rounded px-3 py-2 bg-white" value={partStatus} onChange={(e) => setPartStatus(e.target.value as any)}>
              {PART_STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Butuh Shutdown</label>
            <select className="w-full border rounded px-3 py-2 bg-white" value={needShutdown} onChange={(e) => setNeedShutdown(e.target.value as any)}>
              <option value="all">Semua</option>
              <option value="true">Ya</option>
              <option value="false">Tidak</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={updateUrlFilters} className="w-full bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700">Terapkan</button>
            <button onClick={onReset} className="w-full border rounded px-3 py-2 hover:bg-gray-100">Reset</button>
          </div>
        </div>
      </div>
      
      <BacklogTable
        columns={tableColumns}
        data={rows}
        loading={loading}
        error={error}
        pagination={{ page, totalPages, total }}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/Backlog/detail/${row.id}`)}
      />
    </div>
  );
};

export default BacklogList;