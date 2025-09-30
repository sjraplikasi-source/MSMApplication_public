// src/pages/Backlog/BacklogList.tsx (SUDAH DI-REFACTOR)

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportBacklogsExcel } from "@/utils/exportBacklogsExcel";
import BacklogTable from "@/components/BacklogTable"; // <-- 1. IMPORT KOMPONEN BARU

// --- Tipe Data (tetap sama) ---
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
  priority: 'High' | 'Medium' | 'Low' | 'Improve' | null; // Tambahkan priority
};
type SortBy = "date" | "unit_code" | "registration_code" | "problem" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const STATUS_OPTIONS = ["all", "open", "draft", "validated", "reviewed", "closed", "rejected"] as const;
const PART_STATUS_OPTIONS = ["all", "complete", "waiting"] as const;
const SHUTDOWN_OPTIONS = ["all", "true", "false"] as const;


// --- Komponen Status (bisa dipindah ke file sendiri nanti) ---
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

  // State dan logika fetching tetap sama
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

  useEffect(() => { /* ... Logika filter dari URL (tetap sama) ... */ }, [location.search]);

  useEffect(() => { /* ... Logika fetchData (tetap sama) ... */ }, [location.search, page, pageSize, sortBy, sortDir]);

  const updateUrlFilters = () => { /* ... Logika update URL (tetap sama) ... */ };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const onReset = () => { navigate('/Backlog/list'); };
  const downloadExcelFull = async () => { await exportBacklogsExcel(); };

  // --- 2. DEFINISIKAN KOLOM UNTUK TABEL ---
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
      
      {/* Filter bar (tetap sama) */}
      <div className="bg-gray-50 p-4 rounded-lg border mb-4">
        {/* ... Kode filter bar bro di sini ... */}
      </div>
      
      {/* --- 3. GUNAKAN KOMPONEN BacklogTable --- */}
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