// =============================
// src/pages/Dashboard.tsx
// =============================

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // <-- FIX: Changed to relative path
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

// --- Tipe Data dari Supabase ---
type KpiData = {
  laporanMasuk: number;
  laporanDitutup: number;
  avgDowntime: string;
  menungguValidasi: number;
};
type ParetoData = { name: string; downtime: number };
type MechanicData = { name: string; closed_reports: number };
type ReportData = {
  id: string;
  wo_number: string;
  problem_description: string;
  status: string;
  equipment: { name: string } | null;
};

// --- Komponen UI (tidak berubah) ---
const KpiCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div 
    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
    onClick={onClick}
  >
    <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const ChartContainer = ({ title, children, isLoading }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
    <h3 className="text-md font-semibold text-gray-700 mb-4">{title}</h3>
    <div style={{ width: '100%', height: 300 }}>
      {isLoading ? <div className="flex justify-center items-center h-full text-gray-500">Memuat data...</div> : children}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
    const style = {
        submitted: 'bg-blue-100 text-blue-800',
        approved: 'bg-green-100 text-green-800',
    }[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style}`}>{status}</span>
}

// --- Komponen Utama Dashboard ---
export default function App() {
  const navigate = useNavigate();
  const [paretoTab, setParetoTab] = useState('equipment');
  const [dateRange, setDateRange] = useState('last_7_days');
  const [loading, setLoading] = useState(true);

  // State untuk data dari Supabase
  const [kpiData, setKpiData] = useState<KpiData>({ laporanMasuk: 0, laporanDitutup: 0, avgDowntime: '0 Jam', menungguValidasi: 0 });
  const [paretoEquipment, setParetoEquipment] = useState<ParetoData[]>([]);
  const [paretoProblem, setParetoProblem] = useState<ParetoData[]>([]);
  const [mechanicLeaderboard, setMechanicLeaderboard] = useState<MechanicData[]>([]);
  const [recentReports, setRecentReports] = useState<ReportData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const now = new Date();
        let startDate;

        switch(dateRange) {
            case 'last_7_days': default: startDate = format(subDays(now, 7), 'yyyy-MM-dd'); break;
            case 'this_month': startDate = format(startOfMonth(now), 'yyyy-MM-dd'); break;
            case 'last_30_days': startDate = format(subDays(now, 30), 'yyyy-MM-dd'); break;
        }
        const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

        // Fetch semua data laporan dalam rentang waktu
        const { data: reports, error } = await supabase
            .from('repair_reports')
            .select(`*, equipment:equipment_id(name), problems:problems_id(name), repair_reports_manpower(manpower(name))`)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) {
            console.error("Gagal mengambil data dashboard:", error);
            setLoading(false);
            return;
        }

        // 1. Proses KPI
        const laporanMasuk = reports.length;
        const laporanDitutup = reports.filter(r => r.status === 'approved').length;
        const menungguValidasi = reports.filter(r => r.status === 'submitted').length;
        const totalDowntime = reports.reduce((sum, r) => sum + (r.duration || 0), 0);
        const avgDowntime = laporanMasuk > 0 ? (totalDowntime / laporanMasuk).toFixed(1) + ' Jam' : '0 Jam';
        setKpiData({ laporanMasuk, laporanDitutup, avgDowntime, menungguValidasi });

        // 2. Proses Pareto
        const equipmentMap = new Map<string, number>();
        const problemMap = new Map<string, number>();
        reports.forEach(r => {
            const eqName = r.equipment?.name || 'Unknown Equipment';
            const probName = r.problems?.name || 'Uncategorized';
            equipmentMap.set(eqName, (equipmentMap.get(eqName) || 0) + (r.duration || 0));
            problemMap.set(probName, (problemMap.get(probName) || 0) + (r.duration || 0));
        });
        setParetoEquipment(Array.from(equipmentMap.entries()).map(([name, downtime]) => ({ name, downtime })).sort((a,b) => b.downtime - a.downtime));
        setParetoProblem(Array.from(problemMap.entries()).map(([name, downtime]) => ({ name, downtime })).sort((a,b) => b.downtime - a.downtime));

        // 3. Proses Leaderboard Mekanik
        const mechanicMap = new Map<string, number>();
        reports.filter(r => r.status === 'approved').forEach(r => {
            r.repair_reports_manpower.forEach(m => {
                const mechanicName = m.manpower?.name;
                if(mechanicName) {
                    mechanicMap.set(mechanicName, (mechanicMap.get(mechanicName) || 0) + 1);
                }
            });
        });
        setMechanicLeaderboard(Array.from(mechanicMap.entries()).map(([name, closed_reports]) => ({ name, closed_reports })).sort((a,b) => b.closed_reports - a.closed_reports).slice(0, 5));
        
        // 4. Laporan Terbaru
        setRecentReports(reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));

        setLoading(false);
    };
    fetchData();
  }, [dateRange]);

  const ParetoChart = ({ data }) => (
    <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} fontSize={12} />
            <YAxis label={{ value: 'Total Downtime (Jam)', angle: -90, position: 'insideLeft' }} fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="downtime" fill="#ef4444" name="Downtime (Jam)" />
        </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="bg-gray-50 p-4 sm:p-6 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Daily Report</h1>
          <p className="text-sm text-gray-500">Analisis aktivitas perbaikan dan performa tim.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Filter size={16} className="text-gray-500" />
            <select 
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
            >
                <option value="last_7_days">7 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_30_days">30 Hari Terakhir</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Laporan Masuk" value={kpiData.laporanMasuk} icon={Wrench} color="bg-blue-500" onClick={() => navigate('/reports')} />
        <KpiCard title="Laporan Ditutup" value={kpiData.laporanDitutup} icon={CheckCircle} color="bg-green-500" onClick={() => navigate('/reports?status=approved')} />
        <KpiCard title="Rata-rata Downtime" value={kpiData.avgDowntime} icon={Clock} color="bg-yellow-500" onClick={() => navigate('/reports')} />
        <KpiCard title="Menunggu Validasi" value={kpiData.menungguValidasi} icon={AlertTriangle} color="bg-red-500" onClick={() => navigate('/validasi')} />
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="flex border-b mb-4">
            <button onClick={() => setParetoTab('equipment')} className={`px-4 py-2 text-sm font-medium ${paretoTab === 'equipment' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                By Equipment
            </button>
            <button onClick={() => setParetoTab('problem')} className={`px-4 py-2 text-sm font-medium ${paretoTab === 'problem' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                By Problem Type
            </button>
        </div>
        <ChartContainer title={`Pareto Breakdown ${paretoTab === 'equipment' ? 'by Equipment' : 'by Problem Type'}`} isLoading={loading}>
            <ParetoChart data={paretoTab === 'equipment' ? paretoEquipment : paretoProblem} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-md font-semibold text-gray-700 mb-4">Leaderboard Mekanik (Bulan Ini)</h3>
            {loading ? <p>Loading...</p> :
            <ul className="space-y-3">
                {mechanicLeaderboard.map((mekanik, index) => (
                    <li key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{index + 1}. {mekanik.name}</span>
                        <span className="font-bold text-gray-800">{mekanik.closed_reports} Laporan</span>
                    </li>
                ))}
            </ul>
            }
        </div>
        <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-md font-semibold text-gray-700 mb-4">Aktivitas Laporan Terbaru</h3>
            {loading ? <p>Loading...</p> :
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <tbody>
                        {recentReports.map(report => (
                            <tr key={report.id} className="border-b">
                                <td className="p-2 font-semibold">{report.wo_number}</td>
                                <td className="p-2">{report.equipment?.name}</td>
                                <td className="p-2 text-gray-600">{report.problem_description}</td>
                                <td className="p-2 text-right"><StatusBadge status={report.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            }
        </div>
      </div>
    </div>
  );
}
