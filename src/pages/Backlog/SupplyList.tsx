// =============================
// src/pages/Backlog/SupplyList.tsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { exportSupplyListExcel } from "@/utils/exportSupplyListExcel";

// ---- Types ----
type UUID = string;

// Tambahkan tipe untuk sparepart
type BacklogSparepart = {
  stock_status: string | null;
  estimated_ready_date: string | null;
};

type BacklogRow = {
  id: UUID;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string | null; // ISO date
  status: string | null;
  need_sparepart: boolean | null;
  supply_updated_at: string | null;
  // Tambahkan relasi ke spareparts
  backlog_spareparts: BacklogSparepart[];
};

type SortBy = "date" | "registration_code" | "unit_code" | "status";
type SortDir = "asc" | "desc";
type SmFilter = "all" | "needs_update" | "updated";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// --- KOMPONEN BARU UNTUK LOGIKA STATUS ---
const SupplyStatusBadge: React.FC<{ backlog: BacklogRow }> = ({ backlog }) => {
  const statusResult = useMemo(() => {
    // Prioritas 1: Jika belum pernah diupdate sama sekali
    if (!backlog.supply_updated_at) {
      return { text: "Perlu Update", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    }

    const parts = backlog.backlog_spareparts || [];
    if (parts.length === 0) {
      return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari untuk perbandingan tanggal yang adil

    // Prioritas 2: Cek apakah ada tanggal estimasi yang sudah lewat
    const isOverdue = parts.some(part => {
      if (!part.estimated_ready_date) return false;
      const estDate = new Date(part.estimated_ready_date);
      return estDate < today;
    });

    if (isOverdue) {
      return { text: "Perlu Update Estimasi", color: "bg-red-50 text-red-700 border border-red-200" };
    }

    // Prioritas 3: Cek status kesiapan part
    const totalParts = parts.length;
    const readyParts = parts.filter(p => p.stock_status?.toLowerCase() === 'ready').length;

    if (totalParts > 0 && readyParts === totalParts) {
      return { text: "Semua Part Ready", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    }

    if (readyParts > 0 && readyParts < totalParts) {
      return { text: "Ready Parsial", color: "bg-purple-50 text-purple-700 border border-purple-200" };
    }

    // Default jika sudah diupdate tapi belum ada status khusus
    return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };

  }, [backlog]);

  return (
    <span className={`px-2 py-1 text-xs rounded ${statusResult.color}`}>
      {statusResult.text}
    </span>
  );
};

const SupplyList: React.FC = () => {
  const navigate = useNavigate();

  // data
  const [rows, setRows] = useState<BacklogRow[]>([]);
  const [total, setTotal] = useState(0);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [smFilter, setSmFilter] = useState<SmFilter>("needs_update");
  const [statusFilter, setStatusFilter] = useState<"validated_reviewed" | "all">(
    "validated_reviewed"
  );

  // sorting & paging
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  // debounce
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // reset page saat filter/sort berubah
  useEffect(() => {
    setPage(1);
  }, [qDebounced, dateFrom, dateTo, smFilter, statusFilter, sortBy, sortDir, pageSize]);

  const orderColumn = useMemo(() => {
    switch (sortBy) {
      case "registration_code":
        return "registration_code";
      case "unit_code":
        return "unit_code";
      case "status":
        return "status";
      default:
        return "date";
    }
  }, [sortBy]);

  // fetch
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

let qsup = supabase
  .from("backlogs")
  .select(
    `
      id, registration_code, unit_code, problem, date, status, need_sparepart, supply_updated_at,
      backlog_spareparts (
        stock_status,
        estimated_ready_date
      )
    `,
    { count: "exact" }
  )
  .eq("need_sparepart", true);

        // hanya backlog yang sudah divalidasi/planner review (default)
        if (statusFilter === "validated_reviewed") {
          qsup = qsup.in("status", ["reviewed"]);
        }

        // search
        if (qDebounced) {
          const p = `%${qDebounced}%`;
          qsup = qsup.or(
            `registration_code.ilike.${p},unit_code.ilike.${p},problem.ilike.${p}`
          );
        }

        // date filter
        if (dateFrom) qsup = qsup.gte("date", dateFrom);
        if (dateTo) qsup = qsup.lte("date", dateTo);

        // progress SM
        if (smFilter === "needs_update") qsup = qsup.is("supply_updated_at", null);
        if (smFilter === "updated") qsup = qsup.not("supply_updated_at", "is", null);

        // sort + paging
        qsup = qsup.order(orderColumn, { ascending: sortDir === "asc" }).range(from, to);

        const { data, error, count } = await qsup;
        if (error) throw error;

        if (!cancelled) {
          setRows((data as BacklogRow[]) ?? []);
          setTotal(count || 0);
        }
      } catch (e: any) {
        console.error("SupplyList fetch error:", e?.message || e);
        if (!cancelled) setError(e?.message || "Gagal memuat data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, qDebounced, dateFrom, dateTo, smFilter, statusFilter, orderColumn, sortDir]);

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

  // row click helper (opsional)
  const openDetail = (id: string) => {
    navigate(`/supply/backlog/${encodeURIComponent(id)}`);
  };

  // <-- 3. BUAT FUNGSI HANDLER UNTUK TOMBOL
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await exportSupplyListExcel({
        q: qDebounced,
        dateFrom,
        dateTo,
        smFilter,
        statusFilter,
      });
    } catch (error) {
      console.error("Gagal mendownload Excel:", error);
      alert("Gagal mendownload file Excel. Lihat konsol untuk detail.");
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* <-- 4. MODIFIKASI HEADER DAN TAMBAHKAN TOMBOL --> */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Supply Management — Backlog</h2>
        <button 
          onClick={handleDownloadExcel} 
          disabled={downloading} 
          className="px-3 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
        >
          {downloading ? "Menyiapkan..." : "Download Excel"}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Progress SM</label>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={smFilter}
            onChange={(e) => setSmFilter(e.target.value as SmFilter)}
          >
            <option value="needs_update">Perlu Update</option>
            <option value="updated">Sudah Update</option>
            <option value="all">Semua</option>
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="validated_reviewed">Validated & Reviewed</option>
            <option value="needs_update">Perlu Update</option>
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Kode / Unit / Problem"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3 flex items-end">
          <button className="w-full border rounded px-3 py-2 hover:bg-gray-50" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Dari</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Sampai</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Sort By</label>
          <div className="flex gap-2">
            <select
              className="border rounded px-2 py-2 bg-white flex-1"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="date">Tanggal</option>
              <option value="registration_code">Kode</option>
              <option value="unit_code">Unit</option>
              <option value="status">Status</option>
            </select>
            <select
              className="border rounded px-2 py-2 bg-white"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
            >
              <option value="asc">Naik</option>
              <option value="desc">Turun</option>
            </select>
          </div>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Page Size</label>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as any)}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-lg">
        <table className="w-full table-auto">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b">
              <th className="p-2 text-left">Tanggal</th>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2 text-left">Problem</th>
              <th className="p-2 text-left">Progress SM</th>
              <th className="p-2 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(5, pageSize) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b animate-pulse">
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-24 rounded" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-28 rounded" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-24 rounded" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-64 rounded" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-28 rounded" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 w-16 rounded" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="p-4 text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-600">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(r.id)}
                >
                  <td className="p-2">
                    {r.date ? new Date(r.date).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2">{r.registration_code ?? "-"}</td>
                  <td className="p-2">{r.unit_code}</td>
                  <td className="p-2">
                    <div className="line-clamp-2">{r.problem}</div>
                  </td>
<td className="p-2">
  <SupplyStatusBadge backlog={r} />
</td>
                  <td className="p-2">
                    <Link
                      to={`/supply/backlog/${encodeURIComponent(r.id)}`}
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Lihat
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-600">
          Halaman {page} dari {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            className="border rounded px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            ← Prev
          </button>
          <button
            className="border rounded px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplyList;
