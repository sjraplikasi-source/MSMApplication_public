// src/components/BacklogTable.tsx

import React from 'react';
import { Link } from 'react-router-dom';

// Definisikan tipe props yang akan diterima komponen ini
interface BacklogTableProps {
  columns: Array<{
    key: string;
    header: string;
    render: (row: any) => React.ReactNode; // Fungsi untuk merender sel custom
  }>;
  data: any[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange: (newPage: number) => void;
  onRowClick?: (row: any) => void;
}

const BacklogTable: React.FC<BacklogTableProps> = ({
  columns,
  data,
  loading,
  error,
  pagination,
  onPageChange,
  onRowClick,
}) => {
  const { page, totalPages } = pagination;

  return (
    <>
      <div className="overflow-auto border rounded-lg">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th key={col.key} className="p-2 text-left text-sm font-semibold text-gray-600">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Tampilan Skeleton Loading
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="p-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              // Tampilan Error
              <tr>
                <td colSpan={columns.length} className="p-4 text-center text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              // Tampilan Data Kosong
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-gray-600">
                  Tidak ada data yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              // Tampilan Data Aktual
              data.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-2 align-top text-sm">
                      {/* Gunakan fungsi render custom untuk setiap sel */}
                      {col.render(row)}
                    </td>
                  ))}
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
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← Prev
          </button>
          <button
            className="border rounded px-3 py-1 disabled:opacity-50"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
};

export default BacklogTable;