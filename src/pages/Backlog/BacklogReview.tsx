// =============================
// src/pages/Backlog/BacklogReview.tsx
// =============================

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// ---- Helpers ----
type SortBy = "date" | "unit_code" | "problem";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const BacklogReview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Table states ----
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // ---- UI states ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Search & Filters ----
  const [q, setQ] = useState(""); // search text (unit_code, problem)
  const [validatorFilter, setValidatorFilter] = useState(""); // client-side filter by validated_by_user.name
  const [dateFrom, setDateFrom] = useState<string>(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string>(""); // yyyy-mm-dd

  // ---- Sorting ----
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ---- Pagination ----
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  // Debounce untuk search supaya tidak nge-fetch tiap ketik 1 huruf
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset ke page 1 kalau filter/sort/search berubah
  useEffect(() => {
    setPage(1);
  }, [qDebounced, dateFrom, dateTo, sortBy, sortDir, pageSize]);

  // Build order
  const orderColumn = useMemo(() => {
    switch (sortBy) {
      case "unit_code":
        return "unit_code";
      case "problem":
        return "problem";
      default:
        return "date";
    }
  }, [sortBy]);

  // Fetch
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Hitung range
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Base query
        let query = supabase
          .from("backlogs")
          .select(
            `
            *,
            validated_by_user:users!backlogs_validated_by_fkey(name)
          `,
            { count: "exact" }
          )
          .eq("status", "validated");

        // Search: unit_code OR problem
        if (qDebounced) {
          // ilike untuk case-insensitive
          const pattern = `%${qDebounced}%`;
          // Perhatikan format .or() untuk Supabase
          query = query.or(`unit_code.ilike.${pattern},problem.ilike.${pattern}`);
        }

        // Filter tanggal
        if (dateFrom) query = query.gte("date", dateFrom);
        if (dateTo) query = query.lte("date", dateTo);

        // Sorting
        query = query.order(orderColumn, { ascending: sortDir === "asc" });

        // Pagination
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        if (!cancelled) {
          // Client-side filter untuk validator (karena filter join name di server-side lebih ribet)
          const filtered = (data || []).filter((r) =>
            validatorFilter ? (r?.validated_by_user?.name || "").toLowerCase().includes(validatorFilter.toLowerCase()) : true
          );
          setRows(filtered);
          setTotal(count || 0);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Gagal memuat data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, qDebounced, validatorFilter, dateFrom, dateTo, orderColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ---- UI helpers ----
  const onReset = () => {
    setQ("");
    setValidatorFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("date");
    setSortDir("desc");
    setPage(1);
    setPageSize(20);
  };
  
// ❗ Letakkan setelah semua hooks/efek dideklarasikan
if (user?.role === "mechanic") {
  return (
    <p className="p-4 text-red-600">
      Akses ditolak. Halaman ini tidak tersedia untuk mekanik.
    </p>
  );
}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Review Backlog oleh Planner</h2>

      {/* Filters bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
        <div className="lg:col-span-4">
          <label className="block text-sm font-medium mb-1">Search (Unit / Problem)</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="contoh: 120-CV / bearing"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-sm font-medium mb-1">Validator</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="nama validator"
            value={validatorFilter}
            onChange={(e) => setValidatorFilter(e.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">Dari Tanggal</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">Sampai Tanggal</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="lg:col-span-1 flex items-end">
          <button onClick={onReset} className="w-full border rounded px-3 py-2 hover:bg-gray-50">
            Reset
          </button>
        </div>
      </div>

      {/* Sort & page size */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Sort by:</span>
          <select
            className="border rounded px-2 py-1 bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="date">Tanggal</option>
            <option value="unit_code">Unit</option>
            <option value="problem">Problem</option>
          </select>
          <select
            className="border rounded px-2 py-1 bg-white"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as SortDir)}
          >
            <option value="asc">Naik (A→Z / Lama→Baru)</option>
            <option value="desc">Turun (Z→A / Baru→Lama)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 md:ml-auto">
          <span className="text-sm">Page size:</span>
          <select
            className="border rounded px-2 py-1 bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-600">
            {total === 0 ? "0 hasil" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} dari ${total} hasil`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-lg">
        <table className="w-full table-auto">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b">
              <th className="p-2 text-left">Tanggal</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2 text-left">Problem</th>
              <th className="p-2 text-left">Validator</th>
              <th className="p-2 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: Math.min(5, pageSize) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b animate-pulse">
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 rounded w-64" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </td>
                  <td className="p-2">
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="p-4 text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-600">
                  Tidak ada backlog yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
                  <td className="p-2">{item.unit_code || "-"}</td>
                  <td className="p-2">
                    <div className="line-clamp-2">{item.problem}</div>
                  </td>
                  <td className="p-2">{item.validated_by_user?.name || "-"}</td>
                  <td className="p-2">
                    <button
                      onClick={() => navigate(`/backlog/review/${item.id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Lihat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
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

export default BacklogReview;
