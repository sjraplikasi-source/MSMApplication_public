// src/pages/Backlog/SupplyList.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportSupplyListExcel } from "@/utils/exportSupplyListExcel";
import BacklogTable from "../../components/BacklogTable";
import SupplyStatusBadge from "../../components/SupplyStatusBadge";

// --- Tipe Data ---
type UUID = string;

type BacklogSparepart = { 
  stock_status: string | null; 
  estimated_ready_date: string | null; 
};

type BacklogRow = {
  id: UUID;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string | null;
  status: string | null;
  need_sparepart: boolean | null;
  supply_updated_at: string | null;
  backlog_spareparts: BacklogSparepart[];
};

type SortBy = "date" | "registration_code" | "unit_code" | "status";
type SortDir = "asc" | "desc";

// Filter status SM: "action_required" adalah default gabungan
type SmFilter = "all" | "needs_update" | "updated" | "needs_estimation" | "action_required";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const SupplyList: React.FC = () => {
  const navigate = useNavigate();

  // --- State Data ---
  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // --- State Filter ---
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // Default filter diset ke "action_required" (Perlu Tindakan)
  const [smFilter, setSmFilter] = useState<SmFilter>("action_required");
  const [statusFilter, setStatusFilter] = useState<"validated_reviewed" | "all">("all");

  // --- State Sorting & Paging ---
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset page ke 1 jika filter berubah
  useEffect(() => {
    setPage(1);
  }, [qDebounced, dateFrom, dateTo, smFilter, statusFilter, sortBy, sortDir, pageSize]);

  // --- Main Fetch Logic ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // --- [STEP 1: PRE-FETCH LOGIC] ---
        // Kita perlu mencari ID backlog yang sparepart-nya overdue
        // Logic ini dijalankan jika filter adalah "needs_estimation" ATAU "action_required"
        let filterIds: string[] = [];

        if (smFilter === 'needs_estimation' || smFilter === 'action_required') {
            const todayStr = new Date().toISOString().split('T')[0];
            
            // Cari sparepart yang overdue (estimated date < hari ini)
            // Kita ambil backlog_id nya saja
            const { data: parts, error: partsErr } = await supabase
                .from('backlog_spareparts')
                .select('backlog_id')
                .lt('estimated_ready_date', todayStr); 
            
            if (partsErr) throw partsErr;

            if (parts && parts.length > 0) {
                // Hapus duplikat ID
                // @ts-ignore
                filterIds = Array.from(new Set(parts.map(p => p.backlog_id)));
            }
        }

        // --- [STEP 2: MAIN QUERY] ---
        let query = supabase
          .from("backlogs")
          .select(
            `id, registration_code, unit_code, problem, date, status, need_sparepart, supply_updated_at, backlog_spareparts (stock_status, estimated_ready_date)`,
            { count: "exact" }
          )
          .eq("need_sparepart", true); // Hanya ambil yang butuh sparepart

        // --- [STEP 3: TERAPKAN LOGIC FILTER SM] ---
        
        if (smFilter === 'action_required') {
            // LOGIC GABUNGAN: 
            // 1. Supply Updated IS NULL (Belum dikerjakan)
            // 2. OR ID ada di list overdue (Sudah dikerjakan tapi estimasi lewat)
            
            if (filterIds.length > 0) {
                // Supabase .or() syntax: "kondisi1,kondisi2"
                const idString = filterIds.join(',');
                query = query.or(`supply_updated_at.is.null,id.in.(${idString})`);
            } else {
                // Jika tidak ada yang overdue, cukup cari yang supply_updated_at NULL
                query = query.is("supply_updated_at", null);
            }
        }
        else if (smFilter === 'needs_estimation') {
            // HANYA yang estimasinya lewat & sudah pernah diupdate
            if (filterIds.length > 0) {
                query = query.in('id', filterIds).not("supply_updated_at", "is", null);
            } else {
                // Trik: jika tidak ada data overdue, filter ID yang mustahil (return kosong)
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        } 
        else if (smFilter === "needs_update") {
            // Murni yang belum diisi
            query = query.is("supply_updated_at", null);
        } 
        else if (smFilter === "updated") {
            // Yang sudah diisi (termasuk overdue atau tidak)
            query = query.not("supply_updated_at", "is", null);
        }
        // "all" -> tidak ada filter tambahan pada supply_updated_at

        // --- [UPDATE: FILTER STATUS BACKLOG] ---
        if (statusFilter === "validated_reviewed") {
          query = query.in("status", ["validated", "reviewed"]);
        } else {
          // Jika "Semua Status", kita tetap exclude CLOSED & REJECTED
          query = query.neq("status", "closed").neq("status", "rejected");
        }

        // Filter Pencarian Text
        if (qDebounced) {
          query = query.or(`registration_code.ilike.%${qDebounced}%,unit_code.ilike.%${qDebounced}%,problem.ilike.%${qDebounced}%`);
        }

        // Filter Tanggal Backlog
        if (dateFrom) query = query.gte("date", dateFrom);
        if (dateTo) query = query.lte("date", dateTo);

        // Sorting & Paging
        query = query.order(sortBy, { ascending: sortDir === "asc" }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        setRows((data as BacklogRow[]) ?? []);
        setTotal(count || 0);
      } catch (e: any) {
        console.error(e); 
        setError(e?.message || "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, pageSize, qDebounced, dateFrom, dateTo, smFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  // Fungsi Reset (Kembali ke Default Action Required)
  const onReset = () => {
    setQ("");
    setDateFrom("");
    setDateTo("");
    setSmFilter("action_required"); // Default
    setStatusFilter("validated_reviewed");
    setSortBy("date");
    setSortDir("desc");
    setPage(1);
    setPageSize(20);
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await exportSupplyListExcel({ q: qDebounced, dateFrom, dateTo, smFilter: smFilter as any, statusFilter });
    } catch (error) {
      console.error("Gagal mendownload Excel:", error);
      alert("Gagal mendownload file Excel. Lihat konsol untuk detail.");
    } finally {
      setDownloading(false);
    }
  };
  
  const tableColumns = useMemo(() => [
    { key: 'date', header: 'Tanggal', render: (row: BacklogRow) => row.date ? new Date(row.date).toLocaleDateString() : "-" },
    { key: 'registration_code', header: 'Kode', render: (row: BacklogRow) => row.registration_code || "-" },
    { key: 'unit_code', header: 'Unit', render: (row: BacklogRow) => row.unit_code },
    { key: 'problem', header: 'Problem', render: (row: BacklogRow) => <div className="line-clamp-2">{row.problem}</div> },
    { key: 'progress_sm', header: 'Progress SM', render: (row: BacklogRow) => <SupplyStatusBadge backlog={row} /> },
    { key: 'action', header: 'Aksi', render: (row: BacklogRow) => <Link to={`/supply/backlog/${row.id}`} className="text-blue-600 hover:underline">Update</Link> },
  ], []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Supply Management — Backlog</h2>
        <button onClick={handleDownloadExcel} disabled={downloading} className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 text-sm font-medium">
          {downloading ? "Menyiapkan..." : "Download Excel"}
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-4 lg:col-span-6">
                <label className="block text-sm font-medium mb-1">Search</label>
                <input placeholder="Cari kode, unit, atau problem..." className="w-full border rounded px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            
            {/* Filter SM Progress */}
            <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Progress SM</label>
                <select className="w-full border rounded px-3 py-2 bg-white font-medium text-gray-700" value={smFilter} onChange={(e) => setSmFilter(e.target.value as SmFilter)}>
                    {/* Opsi Default Paling Atas */}
                    <option value="action_required">🔴 Perlu Tindakan (Pending + Overdue)</option>
                    <option disabled>----------------</option>
                    <option value="needs_update">Hanya: Perlu Update</option>
                    <option value="needs_estimation">Hanya: Perlu Update Estimasi</option>
                    <option value="updated">Sudah Update (Semua)</option>
                    <option value="all">Tampilkan Semua</option>
                </select>
            </div>

            {/* Filter Status Backlog */}
            <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Status Backlog</label>
                <select className="w-full border rounded px-3 py-2 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                    <option value="validated_reviewed">Validated & Reviewed</option>
                    <option value="all">Semua Status (Active)</option>
                </select>
            </div>
            
            {/* Filter Tanggal */}
             <div>
                <label className="block text-sm font-medium mb-1">Dari Tanggal</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Sampai Tanggal</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>

            {/* Sorting */}
            <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Urutkan</label>
                <div className="flex gap-2">
                    <select className="w-full border rounded px-3 py-2 bg-white" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                        <option value="date">Tanggal</option>
                        <option value="registration_code">Kode</option>
                        <option value="unit_code">Unit</option>
                        <option value="status">Status</option>
                    </select>
                    <select className="w-full border rounded px-3 py-2 bg-white" value={sortDir} onChange={e => setSortDir(e.target.value as any)}>
                        <option value="desc">Turun</option>
                        <option value="asc">Naik</option>
                    </select>
                </div>
            </div>

            {/* Page Size */}
            <div>
                <label className="block text-sm font-medium mb-1">Per Halaman</label>
                <select className="w-full border rounded px-3 py-2 bg-white" value={pageSize} onChange={e => setPageSize(Number(e.target.value) as any)}>
                    {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
                <button onClick={onReset} className="w-full border rounded px-3 py-2 hover:bg-gray-100 bg-white">Reset</button>
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
        onRowClick={(row) => navigate(`/supply/backlog/${row.id}`)}
      />
    </div>
  );
};

export default SupplyList;