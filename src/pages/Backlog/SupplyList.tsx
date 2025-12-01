// src/pages/Backlog/SupplyList.tsx (LENGKAP & FINAL)

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportSupplyListExcel } from "@/utils/exportSupplyListExcel";
import BacklogTable from "../../components/BacklogTable";
import SupplyStatusBadge from "../../components/SupplyStatusBadge";

// Tipe data
type UUID = string;
type BacklogSparepart = { stock_status: string | null; estimated_ready_date: string | null; };
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
type SmFilter = "all" | "needs_update" | "updated";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;


const SupplyList: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [smFilter, setSmFilter] = useState<SmFilter>("needs_update");
  const [statusFilter, setStatusFilter] = useState<"validated_reviewed" | "all">("validated_reviewed");

  // Sorting & Paging
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, dateFrom, dateTo, smFilter, statusFilter, sortBy, sortDir, pageSize]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("backlogs")
          .select(
            `id, registration_code, unit_code, problem, date, status, need_sparepart, supply_updated_at, backlog_spareparts (stock_status, estimated_ready_date)`,
            { count: "exact" }
          )
          .eq("need_sparepart", true);

        if (statusFilter === "validated_reviewed") {
          query = query.in("status", ["validated", "reviewed"]);
        }
        if (qDebounced) {
          query = query.or(`registration_code.ilike.%${qDebounced}%,unit_code.ilike.%${qDebounced}%,problem.ilike.%${qDebounced}%`);
        }
        if (dateFrom) query = query.gte("date", dateFrom);
        if (dateTo) query = query.lte("date", dateTo);
        if (smFilter === "needs_update") query = query.is("supply_updated_at", null);
        if (smFilter === "updated") query = query.not("supply_updated_at", "is", null);

        query = query.order(sortBy, { ascending: sortDir === "asc" }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        setRows((data as BacklogRow[]) ?? []);
        setTotal(count || 0);
      } catch (e: any) {
        setError(e?.message || "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, pageSize, qDebounced, dateFrom, dateTo, smFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  const onReset = () => {
    setQ("");
    setDateFrom("");
    setDateTo("");
    setSmFilter("needs_update");
    setStatusFilter("validated_reviewed");
    setSortBy("date");
    setSortDir("desc");
    setPage(1);
    setPageSize(20);
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await exportSupplyListExcel({ q: qDebounced, dateFrom, dateTo, smFilter, statusFilter });
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
            <div className="md:col-span-4 lg:col-span-6">
                <label className="block text-sm font-medium mb-1">Search</label>
                <input placeholder="Cari kode, unit, atau problem..." className="w-full border rounded px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Progress SM</label>
                <select className="w-full border rounded px-3 py-2 bg-white" value={smFilter} onChange={(e) => setSmFilter(e.target.value as SmFilter)}>
                    <option value="needs_update">Perlu Update</option>
                    <option value="updated">Sudah Update</option>
                    <option value="all">Semua</option>
                </select>
            </div>
            <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Status Backlog</label>
                <select className="w-full border rounded px-3 py-2 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                    <option value="validated_reviewed">Validated & Reviewed</option>
                    <option value="all">Semua Status</option>
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Dari Tanggal</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Sampai Tanggal</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
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
            <div>
                <label className="block text-sm font-medium mb-1">Per Halaman</label>
                <select className="w-full border rounded px-3 py-2 bg-white" value={pageSize} onChange={e => setPageSize(Number(e.target.value) as any)}>
                    {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
            </div>
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