// src/pages/ReportDetail.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useReportById } from '../hooks/useReportById';

const ReportDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { report, loading, error } = useReportById(id!);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!report) return <p>Laporan tidak ditemukan</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/reports" className="flex items-center gap-2 text-blue-600 mb-4">
        <ArrowLeft size={18} /> Kembali
      </Link>
      <h2 className="text-xl font-semibold mb-6">Detail Laporan</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Detail label="Nomor WO" value={report.wo_number} />
        <Detail label="Equipment Name" value={report.equipment?.name} />
        <Detail label="Equipment Code" value={report.equipment?.code} />
        <Detail label="Failure" value={report.failure?.name} />
        <Detail label="Diagnosis" value={report.diagnosis?.name} />
        <Detail label="Action" value={report.action?.name} />
        <Detail label="Instruction" value={report.instruction?.name} />
        <Detail label="Reason" value={report.reason?.name} />
        <Detail label="Sub Component" value={report.sub_component?.name} />
        <Detail label="Finding" value={report.finding?.name} />
        <Detail label="Problem" value={report.problems?.name} />
        <Detail label="Activity" value={report.activity?.name} />
        <Detail label="Activity Type" value={report.activity_type?.name} />
        <Detail label="Area" value={report.area?.name} />
        <Detail label="Part Number" value={report.part_number} />
        <Detail label="Hour Meter" value={report.hour_meter} />
        <Detail label="Shift" value={report.shift} />
        <Detail label="Status Breakdown" value={report.status_breakdown} />
        <Detail label="Activity Status" value={report.activity_status} />
        <Detail label="Status" value={report.status} />
        <Detail label="Disetujui Oleh" value={report.approved_name} />
        <Detail label="Deskripsi Masalah" value={report.problem_description} />
        <Detail label="Komentar Mekanik" value={report.mechanic_comment} />
        <Detail label="Waktu Dibuat" value={new Date(report.created_at).toLocaleString()} />
      </div>

      {report.repair_reports_manpower?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Manpower</h3>
          <ul className="list-disc list-inside">
            {report.repair_reports_manpower.map((r: any) => (
              <li key={r.manpower.id}>{r.manpower.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-base font-medium text-gray-800">{value || '-'}</p>
  </div>
);

export default ReportDetail;
