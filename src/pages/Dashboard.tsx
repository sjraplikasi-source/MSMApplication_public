// =============================
// src/pages/Dashboard.tsx
// =============================

import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, // <-- DIUBAH
  Bar, 
  Line, // <-- DITAMBAH
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine // <-- DITAMBAH
} from 'recharts';
import { Filter, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth } from 'date-fns';

// --- Tipe Data dari Supabase ---
type KpiData = {
  laporanMasuk: number;
  laporanDitutup: number;
  avgDowntime: string;
  menungguValidasi: number;
};
// --- DIUBAH: Ditambahkan cumulativePercent ---
type ParetoData = { 
  name: string; 
  downtime: number; 
  cumulativePercent: number; 
};
type MechanicData = { name: string; closed_reports: number };
type ReportData = {
  id: string;
  wo_number: string;
  problem_description: string;
  status: string;
  equipment: { name: string } | null;
  problems: { name: string } | null;
  repair_reports_manpower: { manpower: { name: string } | null }[];
  created_at: string;
  duration: number | null;
};

// --- Komponen UI (tidak berubah) ---
const KpiCard = ({ title, value, icon: Icon, color, onClick }) => (
  <button
    type="button"
    className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:gap-4 sm:p-4"
    onClick={onClick}
  >
    <div className={`p-3 rounded-full ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
      <p className="break-words text-xl font-bold text-gray-800 sm:text-2xl">{value}</p>
    </div>
  </button>
);

const ChartContainer = ({ title, children, isLoading, isMobile = false }) => (
  <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
    <h3 className="mb-3 text-sm font-semibold text-gray-700 sm:mb-4 sm:text-base">{title}</h3>
    <div
      className="w-full min-w-0"
      style={{
        height: isMobile ? 'clamp(320px, 90vw, 360px)' : 'clamp(300px, 32vw, 360px)',
      }}
    >
      {isLoading ? <div className="flex h-full items-center justify-center text-sm text-gray-500">Memuat data...</div> : children}
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
  const [isMobileChart, setIsMobileChart] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );

  // Keep chart axis density aligned with the Tailwind mobile breakpoint (sm = 640px).
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateChartViewport = () => setIsMobileChart(mediaQuery.matches);
    updateChartViewport();
    mediaQuery.addEventListener('change', updateChartViewport);

    return () => mediaQuery.removeEventListener('change', updateChartViewport);
  }, []);

  // State untuk data dari Supabase
  const [kpiData, setKpiData] = useState<KpiData>({ laporanMasuk: 0, laporanDitutup: 0, avgDowntime: '0 Jam', menungguValidasi: 0 });
  
  // --- Tipenya diubah untuk menampung cumulativePercent ---
  const [paretoEquipment, setParetoEquipment] = useState<ParetoData[]>([]);
  const [paretoProblem, setParetoProblem] = useState<ParetoData[]>([]);
  
  const [mechanicLeaderboard, setMechanicLeaderboard] = useState<MechanicData[]>([]);
  const [recentReports, setRecentReports] = useState<ReportData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'last_7_days': default: startDate = format(subDays(now, 7), 'yyyy-MM-dd'); break;
        case 'this_month': startDate = format(startOfMonth(now), 'yyyy-MM-dd'); break;
        case 'last_30_days': startDate = format(subDays(now, 30), 'yyyy-MM-dd'); break;
      }
      
      const endDate = format(now, 'yyyy-MM-dd');

      // Query validasi (tidak berubah)
      const { count: validationCount, error: validationError } = await supabase
        .from('repair_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      if (validationError) {
        console.error("Gagal mengambil data validasi:", validationError);
      }

      // Query laporan utama (tidak berubah)
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

      // 1. Proses KPI (tidak berubah)
      const laporanMasuk = reports.length;
      const laporanDitutup = reports.filter(r => r.status === 'approved').length;
      const totalDowntime = reports.reduce((sum, r) => sum + (r.duration || 0), 0);
      const avgDowntime = laporanMasuk > 0 ? (totalDowntime / laporanMasuk).toFixed(1) + ' Jam' : '0 Jam';
      setKpiData({
        laporanMasuk,
        laporanDitutup,
        avgDowntime,
        menungguValidasi: validationCount || 0
      });

      // --- PERUBAHAN LOGIKA PARETO DI SINI ---
      // 2. Proses Pareto (DIPERBARUI)
      
      // Helper function untuk kalkulasi Pareto
      const calculatePareto = (map: Map<string, number>): ParetoData[] => {
          const sorted = Array.from(map.entries())
              .map(([name, downtime]) => ({ name, downtime: parseFloat(downtime.toFixed(2)) }))
              .sort((a, b) => b.downtime - a.downtime);

          let total = sorted.reduce((sum, d) => sum + d.downtime, 0);
          if (total === 0) total = 1; // Hindari pembagian dengan nol

          let cumulative = 0;
          return sorted.map((item) => {
              cumulative += item.downtime;
              return {
                  ...item,
                  cumulativePercent: parseFloat(((cumulative / total) * 100).toFixed(2))
              };
          });
      };

      const equipmentMap = new Map<string, number>();
      const problemMap = new Map<string, number>();
      reports.forEach(r => {
        const eqName = r.equipment?.name || 'Unknown Equipment';
        const probName = r.problems?.name || 'Uncategorized';
        const dur = r.duration || 0;
        equipmentMap.set(eqName, (equipmentMap.get(eqName) || 0) + dur);
        problemMap.set(probName, (problemMap.get(probName) || 0) + dur);
      });

      // Gunakan helper function untuk menghitung data Pareto
      setParetoEquipment(calculatePareto(equipmentMap));
      setParetoProblem(calculatePareto(problemMap));
      // --- AKHIR PERUBAHAN LOGIKA PARETO ---


      // 3. Proses Leaderboard Mekanik (tidak berubah)
      const mechanicMap = new Map<string, number>();
      reports.filter(r => r.status === 'approved').forEach(r => {
        r.repair_reports_manpower.forEach(m => {
          const mechanicName = m.manpower?.name;
          if (mechanicName) {
            mechanicMap.set(mechanicName, (mechanicMap.get(mechanicName) || 0) + 1);
          }
        });
      });
      setMechanicLeaderboard(Array.from(mechanicMap.entries()).map(([name, closed_reports]) => ({ name, closed_reports })).sort((a, b) => b.closed_reports - a.closed_reports).slice(0, 5));

      // 4. Laporan Terbaru (tidak berubah)
      setRecentReports(reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));

      setLoading(false);
    };
    fetchData();
  }, [dateRange]);

  // Pareto chart adapts axis labels and margins for narrow mobile screens.
  const ParetoChart = ({ data }: { data: ParetoData[] }) => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{
          top: isMobileChart ? 24 : 8,
          right: isMobileChart ? 2 : 18,
          left: isMobileChart ? -24 : -10,
          bottom: isMobileChart ? 54 : 42,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={isMobileChart ? -40 : -45}
          textAnchor="end"
          interval={isMobileChart ? 'preserveStartEnd' : 0}
          height={isMobileChart ? 86 : 72}
          tick={{ fontSize: isMobileChart ? 9 : 11 }}
          tickMargin={isMobileChart ? 6 : 8}
          tickFormatter={(value: string) =>
            isMobileChart && value.length > 13 ? `${value.slice(0, 12)}…` : value
          }
          tickLine={!isMobileChart}
        />
        {/* Y-Axis kiri: label disembunyikan di mobile untuk menghemat lebar plot. */}
        <YAxis
          yAxisId="left"
          orientation="left"
          width={isMobileChart ? 32 : 52}
          label={isMobileChart ? undefined : { value: 'Downtime (Jam)', angle: -90, position: 'insideLeft', fontSize: 10 }}
          tick={{ fontSize: isMobileChart ? 9 : 11 }}
          tickLine={!isMobileChart}
        />
        {/* Y-Axis kanan: cukup 0, 50, 100 pada mobile; detail tetap tersedia di tooltip. */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          ticks={isMobileChart ? [0, 50, 100] : [0, 20, 40, 60, 80, 100]}
          width={isMobileChart ? 28 : 54}
          label={isMobileChart ? undefined : { value: 'Cumulative %', angle: 90, position: 'insideRight', fontSize: 10 }}
          tick={{ fontSize: isMobileChart ? 9 : 11 }}
          tickLine={!isMobileChart}
        />
        <Tooltip
          contentStyle={{ fontSize: isMobileChart ? 11 : 12, borderRadius: 8 }}
          formatter={(value: number, name: string) => {
            if (name === 'Cumulative %') return [`${value.toFixed(2)}%`, name];
            if (name === 'Downtime (Jam)') return [`${value.toFixed(2)} hours`, name];
            return [value, name];
          }}
        />
        <Legend
          verticalAlign={isMobileChart ? 'top' : 'bottom'}
          align={isMobileChart ? 'right' : 'center'}
          iconSize={isMobileChart ? 8 : 10}
          wrapperStyle={{ fontSize: isMobileChart ? 10 : 12 }}
        />
        <ReferenceLine y={80} yAxisId="right" stroke="green" strokeDasharray="5 5" />
        <Bar yAxisId="left" dataKey="downtime" fill="#ef4444" name="Downtime (Jam)" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulativePercent"
          stroke="#ff7300"
          name="Cumulative %"
          strokeWidth={isMobileChart ? 2 : 3}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
  // --- AKHIR PERUBAHAN PARETO CHART ---


  return (
    <div className="min-w-0 w-full bg-gray-50 p-0 font-sans">
      <div className="mb-5 flex min-w-0 flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold leading-tight text-gray-800 sm:text-2xl">Dashboard Daily Report</h1>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 sm:text-sm">Analisis aktivitas perbaikan dan performa tim.</p>
        </div>
        <div className="mt-1 flex w-full items-center gap-2 sm:mt-0 sm:w-auto">
          <Filter size={16} className="shrink-0 text-gray-500" />
          <select
            className="w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="last_7_days">7 Hari Terakhir</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_30_days">30 Hari Terakhir</option>
          </select>
        </div>
      </div>

      {/* KPI Cards (tidak berubah) */}
      <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard title="Laporan Masuk" value={kpiData.laporanMasuk} icon={Wrench} color="bg-blue-500" onClick={() => navigate('/reports')} />
        <KpiCard title="Laporan Ditutup" value={kpiData.laporanDitutup} icon={CheckCircle} color="bg-green-500" onClick={() => navigate('/reports?status=approved')} />
        <KpiCard title="Rata-rata Downtime" value={kpiData.avgDowntime} icon={Clock} color="bg-yellow-500" onClick={() => navigate('/reports')} />
        <KpiCard title="Menunggu Validasi" value={kpiData.menungguValidasi} icon={AlertTriangle} color="bg-red-500" onClick={() => navigate('/validasi')} />
      </div>

      {/* Pareto Chart Container (tidak berubah, tapi akan me-render chart baru) */}
      <div className="mb-5 min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
        <div className="mb-3 flex min-w-0 border-b sm:mb-4">
          <button onClick={() => setParetoTab('equipment')} className={`min-w-0 flex-1 px-2 py-2 text-xs font-medium sm:flex-none sm:px-4 sm:text-sm ${paretoTab === 'equipment' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            By Equipment
          </button>
          <button onClick={() => setParetoTab('problem')} className={`min-w-0 flex-1 px-2 py-2 text-xs font-medium sm:flex-none sm:px-4 sm:text-sm ${paretoTab === 'problem' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            By Problem Type
          </button>
        </div>
        <ChartContainer
          title={`Pareto R&M Activity ${paretoTab === 'equipment' ? 'by Equipment' : 'by Problem Type'}`}
          isLoading={loading}
          isMobile={isMobileChart}
        >
          <ParetoChart data={paretoTab === 'equipment' ? paretoEquipment : paretoProblem} />
        </ChartContainer>
      </div>

      {/* Grid Bawah (tidak berubah) */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-1">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Leaderboard Mekanik (Bulan Ini)</h3>
          {loading ? <div className="text-sm text-gray-500">Memuat data...</div> :
            <ul className="space-y-3">
              {mechanicLeaderboard.length > 0 ? mechanicLeaderboard.map((mekanik, index) => (
                <li key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate pr-2">{index + 1}. {mekanik.name}</span>
                  <span className="font-bold text-gray-800 flex-shrink-0">{mekanik.closed_reports} Laporan</span>
                </li>
              )) : <p className="text-sm text-gray-500">Belum ada data.</p>}
            </ul>
          }
        </div>
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 sm:text-base">Aktivitas Laporan Terbaru</h3>
          {loading ? <div className="text-sm text-gray-500">Memuat data...</div> :
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[620px] text-sm">
                <tbody>
                  {recentReports.length > 0 ? recentReports.map(report => (
                    <tr key={report.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="p-2 font-semibold text-gray-800">{report.wo_number || 'N/A'}</td>
                      <td className="p-2 text-gray-700">{report.equipment?.name || 'N/A'}</td>
                      <td className="p-2 text-gray-600 truncate max-w-xs">{report.problem_description}</td>
                      <td className="p-2 text-right"><StatusBadge status={report.status} /></td>
                    </tr>
                  )) : <tr className="text-sm text-gray-500 text-center"><td colSpan={4} className="p-4">Belum ada laporan terbaru.</td></tr>}
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  );
}