// =============================
// src/pages/Backlog/BacklogDashboard.tsx
// =============================
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Filter, Download, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // <-- FIX: Changed to relative path
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Deklarasikan html2canvas agar TypeScript tidak error saat kita memanggilnya dari window
declare const html2canvas: any;

// --- Tipe Data ---
type KpiData = {
  totalOpen: number;
  waitingValidation: number;
  waitingReview: number;
  waitingSupply: number;
  siapDikerjakan: number;
};
type MonthlyData = { month: string; created: number; closed: number };
type EquipmentData = { name: string; value: number };
type PartStatusData = { name: string; value: number };
type ResourceData = { name: string; value: number; filterKey: string; filterValue: string };
type PriorityData = { name: string; value: number };

// --- Komponen UI ---
const KpiCard = ({ title, value, description, icon: Icon, color, onClick }) => (
  <div 
    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${color}`} />
        </div>
    </div>
    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
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
const ResourceTable = ({ data, navigate }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-full">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Analisis Kebutuhan & Kesiapan</h3>
        <div className="space-y-3">
            {data.map(item => (
                <div 
                    key={item.name} 
                    className="flex justify-between items-center border-b pb-2 hover:bg-gray-50 p-2 rounded-md cursor-pointer"
                    onClick={() => navigate(`/Backlog/list?${item.filterKey}=${item.filterValue}`)}
                >
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-lg font-bold text-gray-800">{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);
const COLORS = ['#FF8042', '#0088FE', '#00C49F'];
const PRIORITY_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#6B7280'];

// --- Komponen Utama Dashboard ---
export default function App() {
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  const [dateRange, setDateRange] = useState('this_year');
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const [kpiData, setKpiData] = useState<KpiData>({ totalOpen: 0, waitingValidation: 0, waitingReview: 0, waitingSupply: 0, siapDikerjakan: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [equipmentData, setEquipmentData] = useState<EquipmentData[]>([]);
  const [partStatusData, setPartStatusData] = useState<PartStatusData[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityData[]>([]);
  const [resourceData, setResourceData] = useState<ResourceData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let startDate, endDate;
      switch(dateRange) {
        case 'last_7_days': startDate = format(subDays(now, 7), 'yyyy-MM-dd'); endDate = format(now, 'yyyy-MM-dd'); break;
        case 'last_30_days': startDate = format(subDays(now, 30), 'yyyy-MM-dd'); endDate = format(now, 'yyyy-MM-dd'); break;
        case 'this_month': startDate = format(startOfMonth(now), 'yyyy-MM-dd'); endDate = format(endOfMonth(now), 'yyyy-MM-dd'); break;
        case 'this_year': default: startDate = format(startOfYear(now), 'yyyy-MM-dd'); endDate = format(endOfYear(now), 'yyyy-MM-dd'); break;
      }

      const { data, error } = await supabase
        .from('backlogs')
        .select('*, backlog_spareparts(stock_status)', { count: 'exact' })
        .gte('created_at', startDate)
        .lte('created_at', endDate);
        
      if (error) { console.error("Error fetching data:", error); setLoading(false); return; }

      const openBacklogs = data.filter(b => b.status !== 'closed' && b.status !== 'rejected');

      // --- LOGIKA BARU UNTUK MENGHITUNG PRIORITAS ---
      const priorityCounts = openBacklogs.reduce((acc, backlog) => {
        const priority = backlog.priority || 'Improve'; // Jika prioritas null, anggap 'Improve'
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const formattedPriorityData: PriorityData[] = [
        { name: 'High', value: priorityCounts.High || 0 },
        { name: 'Medium', value: priorityCounts.Medium || 0 },
        { name: 'Low', value: priorityCounts.Low || 0 },
        { name: 'Improve', value: priorityCounts.Improve || 0 },
      ].filter(p => p.value > 0); // Hanya tampilkan prioritas yang ada backlognya

      setPriorityData(formattedPriorityData);
      // --- AKHIR LOGIKA BARU ---
      
      const waitingValidation = openBacklogs.filter(b => b.status === 'draft').length;
      const waitingReview = openBacklogs.filter(b => b.status === 'validated').length;
      // const waitingSupply = openBacklogs.filter(b => b.status === 'reviewed' && b.need_sparepart).length;
      const waitingSupply = openBacklogs.filter(b => 
    b.status === 'reviewed' && 
    b.need_sparepart && 
    b.supply_updated_at === null
).length;
      
      let siapDikerjakanCount = 0;
      let waitingPartCount = 0;
      let partCompleteCount = 0;
      let noPartNeededCount = 0;
      let needShutdownCount = 0;
      let needToolsCount = 0;
      let needManpowerCount = 0;

openBacklogs.forEach(b => {
        if (b.need_shutdown) needShutdownCount++;
        if (b.need_tools) needToolsCount++;
        if (b.need_manpower) needManpowerCount++;

        let isPartReady = false;
        if (!b.need_sparepart) {
            noPartNeededCount++;
            isPartReady = true; // Langsung dianggap ready jika tidak butuh part
        } else {
            const parts = b.backlog_spareparts || [];
            if (parts.length > 0 && parts.every(p => p.stock_status?.toLowerCase() === 'ready')) {
                partCompleteCount++;
                isPartReady = true;
            } else {
                waitingPartCount++;
            }
        }
        
        // --- LOGIKA BARU YANG SUDAH DIPERBAIKI ---
        // Sebuah backlog siap dikerjakan HANYA JIKA part-nya ready DAN tidak butuh shutdown
        if (isPartReady && !b.need_shutdown) {
            siapDikerjakanCount++;
        }
      });
      
      setKpiData({ totalOpen: openBacklogs.length, waitingValidation, waitingReview, waitingSupply, siapDikerjakan: siapDikerjakanCount });
      setPartStatusData([ { name: 'Waiting Part', value: waitingPartCount }, { name: 'Part Complete', value: partCompleteCount }, { name: 'No Part Needed', value: noPartNeededCount }, ]);
      setResourceData([
        { name: 'Waiting Part', value: waitingPartCount, filterKey: 'part_status', filterValue: 'waiting' },
        { name: 'Part Complete', value: partCompleteCount, filterKey: 'part_status', filterValue: 'complete' },
        { name: 'Butuh Shutdown', value: needShutdownCount, filterKey: 'need_shutdown', filterValue: 'true' },
        { name: 'Butuh Special Tools', value: needToolsCount, filterKey: 'need_tools', filterValue: 'true' },
        { name: 'Butuh Manpower Extra', value: needManpowerCount, filterKey: 'need_manpower', filterValue: 'true' },
      ]);

      const monthlyMap = new Map<string, { created: number; closed: number }>();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      monthNames.forEach(m => monthlyMap.set(m, { created: 0, closed: 0 }));
      data.forEach(b => {
        const month = monthNames[new Date(b.created_at).getMonth()];
        if (monthlyMap.has(month)) { monthlyMap.get(month)!.created++; if (b.status === 'closed') { monthlyMap.get(month)!.closed++; } }
      });
      setMonthlyData(Array.from(monthlyMap.entries()).map(([month, values]) => ({ month, ...values })));
      const equipmentMap = new Map<string, number>();
      openBacklogs.forEach(b => { equipmentMap.set(b.unit_code, (equipmentMap.get(b.unit_code) || 0) + 1); });
      setEquipmentData(Array.from(equipmentMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10));

      setLoading(false);
    };
    fetchData();
  }, [dateRange]);

  const handleDownloadImage = async () => {
    if (!dashboardRef.current) return;

    if (typeof (window as any).html2canvas === 'undefined') {
      alert('Gagal: Library untuk download belum siap. Pastikan script sudah ditambahkan di index.html dan coba refresh halaman.');
      console.error("html2canvas is not defined on the window object.");
      return;
    }

    setIsDownloading(true);
    try {
      const canvas = await (window as any).html2canvas(dashboardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#f9fafb'
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `dashboard-backlog-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 sm:p-6 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Backlog</h1>
          <p className="text-sm text-gray-500">Ringkasan status dan tren backlog pemeliharaan.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <select className="border rounded-md px-3 py-1.5 text-sm bg-white" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                    <option value="this_year">Tahun Ini</option>
                    <option value="this_month">Bulan Ini</option>
                    <option value="last_30_days">30 Hari Terakhir</option>
                    <option value="last_7_days">7 Hari Terakhir</option>
                </select>
            </div>
            <button onClick={handleDownloadImage} disabled={isDownloading || loading} className="flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm bg-white hover:bg-gray-50 disabled:opacity-50">
              <Download size={16} />
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>
        </div>
      </div>
      
      <div ref={dashboardRef} className="bg-gray-50 p-1">
        {loading ? <div className="text-center py-10">Memuat data dashboard...</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard title="Total Backlog Open" value={kpiData.totalOpen} description="Semua status kecuali Closed & Rejected" icon={Wrench} color="text-gray-500" onClick={() => navigate('/Backlog/list?status=open')} />
            <KpiCard title="Menunggu Validasi" value={kpiData.waitingValidation} description="Status 'draft'" icon={AlertTriangle} color="text-red-500" onClick={() => navigate('/Backlog/list?status=draft')} />
            <KpiCard title="Menunggu Review" value={kpiData.waitingReview} description="Status 'validated'" icon={Clock} color="text-yellow-500" onClick={() => navigate('/Backlog/list?status=validated')} />
            <KpiCard title="Menunggu Update SM" value={kpiData.waitingSupply} description="Perlu update status part" icon={Clock} color="text-purple-500" onClick={() => navigate('/supply/backlog?smFilter=needs_update&statusFilter=validated_reviewed')} />
            <KpiCard title="Siap Dikerjakan" value={kpiData.siapDikerjakan} description="Part ready & tidak butuh shutdown" icon={CheckCircle} color="text-green-500" onClick={() => navigate('/Backlog/list?part_status=complete&need_shutdown=false')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartContainer title="Tren Backlog Bulanan" isLoading={loading}>
              <ResponsiveContainer><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend /><Line type="monotone" dataKey="created" name="Created" stroke="#8884d8" strokeWidth={2} /><Line type="monotone" dataKey="closed" name="Closed" stroke="#82ca9d" strokeWidth={2} /></LineChart></ResponsiveContainer>
            </ChartContainer>
            <ChartContainer title="Top 10 Equipment Backlog Open" isLoading={loading}>
              <ResponsiveContainer><BarChart data={equipmentData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="name" width={80} fontSize={12} interval={0} /><Tooltip /><Bar dataKey="value" name="Jumlah Backlog" fill="#3b82f6" /></BarChart></ResponsiveContainer>
            </ChartContainer>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Status Kesiapan Part" isLoading={loading}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={partStatusData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  outerRadius={80} 
                  fill="#8884d8" 
                  dataKey="value" 
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {partStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Status Prioritas Backlog" isLoading={loading}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={priorityData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={80} 
                  fill="#8884d8" 
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="lg:col-span-2">
            <ResourceTable data={resourceData} navigate={navigate} />
          </div>
        </div>
        {/* --- AKHIR DARI BAGIAN YANG DIMODIFIKASI --- */}

        </>
        )}
      </div>
    </div>
  );
}
