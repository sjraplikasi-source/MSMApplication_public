// src/components/SupplyStatusBadge.tsx

import React, { useMemo } from 'react';

// Ambil tipe data dari BacklogList atau definisikan ulang di sini jika perlu
type BacklogRow = {
  need_sparepart: boolean;
  supply_updated_at: string | null;
  backlog_spareparts: Array<{
    stock_status: string | null;
    estimated_ready_date: string | null;
  }>;
};

const SupplyStatusBadge: React.FC<{ backlog: BacklogRow }> = ({ backlog }) => {
  const statusResult = useMemo(() => {
    if (!backlog.need_sparepart) {
      return { text: "Tanpa Part", color: "bg-gray-100 text-gray-700 border border-gray-200" };
    }
    if (!backlog.supply_updated_at) {
      return { text: "Perlu Update", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    }
    const parts = backlog.backlog_spareparts || [];
    if (parts.length === 0) {
      return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = parts.some(part => part.estimated_ready_date && new Date(part.estimated_ready_date) < today);
    if (isOverdue) {
      return { text: "Perlu Update Estimasi", color: "bg-red-50 text-red-700 border border-red-200" };
    }
    const readyParts = parts.filter(p => p.stock_status?.toLowerCase() === 'ready').length;
    if (parts.length > 0 && readyParts === parts.length) {
      return { text: "Semua Part Ready", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    }
    if (readyParts > 0) {
      return { text: "Ready Parsial", color: "bg-purple-50 text-purple-700 border border-purple-200" };
    }
    return { text: "Sudah Update", color: "bg-green-50 text-green-700 border border-green-200" };
  }, [backlog]);

  return <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusResult.color}`}>{statusResult.text}</span>;
};

export default SupplyStatusBadge;