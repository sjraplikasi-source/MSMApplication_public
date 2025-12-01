// =============================
// src/pages/ReportValidation.tsx
// =============================

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ReportValidation = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('repair_reports')
        .select(`id, wo_number, created_at, status, equipment:equipment_id (name)`)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setReports(data || []);
      setLoading(false);
    };

    if (user) fetchReports();
  }, [user]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('repair_reports')
      .update({
      status: 'approved',
      approved_by: user.id,
      approved_by_id: user.id,
      approved_name: user.full_name || user.name || user.email
    })
      .eq('id', id);

    if (!error) setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('repair_reports')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (!error) setReports((prev) => prev.filter((r) => r.id !== id));
  };

  if (authLoading || loading) return <p className="p-4">Loading...</p>;
  if (!user) return <p className="p-4 text-red-600">Harap login terlebih dahulu.</p>;
  if (user?.role === 'mechanic') return <p className="p-4 text-red-600">Akses ditolak. Halaman ini tidak tersedia untuk mekanik.</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Validasi Laporan Breakdown</h2>

      {reports.length === 0 ? (
        <p>Tidak ada laporan yang perlu divalidasi.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border rounded p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">WO: {report.wo_number}</p>
                <p className="text-sm text-gray-600">
                  Equipment: {report.equipment?.name || '-'} | Tanggal: {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/reports/edit/${report.id}`)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleApprove(report.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                >
                  Setujui
                </button>
                <button
                  onClick={() => handleReject(report.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportValidation;
