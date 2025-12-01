// src/pages/Operational/EnergyMonitoring.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { startOfYear, endOfYear, eachMonthOfInterval, format, addMonths, startOfMonth } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement);

const EnergyMonitoring: React.FC = () => {
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('konsumsi');
  const [year, setYear] = useState(new Date().getFullYear());

  const GI_FACTOR = 24000;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const yearDate = new Date(year, 0, 1);
      const startDate = startOfYear(yearDate);
      const endDate = endOfYear(yearDate);
      // Kita butuh data Januari tahun berikutnya untuk menghitung konsumsi Desember
      const nextYearStartDate = addMonths(startDate, 12);
      
      try {
        // Ambil data dari awal tahun yang dipilih hingga awal tahun berikutnya
        const { data: readings, error: fetchError } = await supabase
          .from('energy_meter_readings')
          .select('meter_type, reading_at, reading_value')
          .gte('reading_at', startDate.toISOString())
          .lt('reading_at', addMonths(nextYearStartDate, 1).toISOString()) // Ambil data sampai Februari tahun berikutnya
          .order('reading_at', { ascending: true });

        if (fetchError) throw fetchError;
        
        const monthlyInterval = eachMonthOfInterval({ start: startDate, end: endDate });
        
        const monthlyData = monthlyInterval.map(monthDate => {
            const currentMonthStart = startOfMonth(monthDate);
            const nextMonthStart = addMonths(currentMonthStart, 1);

            // Fungsi baru yang lebih cerdas
            const getDelta = (type: string) => {
                // Cari pembacaan paling awal di bulan ini (atau setelahnya)
                const firstReadingCurrentMonth = readings.find(r => 
                    r.meter_type === type && new Date(r.reading_at) >= currentMonthStart
                );
                // Cari pembacaan paling awal di bulan berikutnya (atau setelahnya)
                const firstReadingNextMonth = readings.find(r => 
                    r.meter_type === type && new Date(r.reading_at) >= nextMonthStart
                );

                if (firstReadingCurrentMonth && firstReadingNextMonth) {
                    return firstReadingNextMonth.reading_value - firstReadingCurrentMonth.reading_value;
                }
                return 0; // Jika salah satu data tidak ada, konsumsi dianggap 0
            };

            const deltaGI = getDelta('PLN_GI');
            const deltaGH = getDelta('PLN_GH');
            const deltaSUTM = getDelta('GENSET_SUTM');
            const deltaOPP = getDelta('GENSET_OPP');

            const energiGenset = (deltaSUTM + deltaOPP) / 1000;
            const energiGI = (deltaGI * GI_FACTOR) / 1000;
            const energiGH = deltaGH / 1000;
            
            const totalEnergi = energiGenset + energiGI;
            const plnVsTotal = totalEnergi > 0 ? (energiGI / totalEnergi) : 0;
            const loss = energiGI - energiGH;
            const efisiensi = energiGI > 0 ? (energiGH / energiGI) : 0;

            return {
                month: format(monthDate, 'MMM-yy'),
                energiGenset: parseFloat(energiGenset.toFixed(1)),
                energiGI: parseFloat(energiGI.toFixed(1)),
                energiGH: parseFloat(energiGH.toFixed(1)),
                totalEnergi: parseFloat(totalEnergi.toFixed(1)),
                plnVsTotal,
                loss: parseFloat(loss.toFixed(1)),
                efisiensi
            };
        });

        setProcessedData(monthlyData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Energy (MWh)' } }, y1: { position: 'right', beginAtZero: true, max: 1, ticks: { callback: value => `${(value * 100).toFixed(0)}%` }, title: { display: true, text: 'Persentase (%)' } } } };
  const konsumsiChartData = { labels: processedData.map(d => d.month), datasets: [ { type: 'bar', label: 'Energy Genset (MWh)', data: processedData.map(d => d.energiGenset), backgroundColor: '#60a5fa' }, { type: 'bar', label: 'Energy GI-PLN (MWh)', data: processedData.map(d => d.energiGI), backgroundColor: '#93c5fd' }, { type: 'bar', label: 'Total Energy (MWh)', data: processedData.map(d => d.totalEnergi), backgroundColor: '#9ca3af' }, { type: 'line', label: 'Energy PLN vs Total (%)', data: processedData.map(d => d.plnVsTotal), borderColor: '#facc15', yAxisID: 'y1', tension: 0.1 } ] };
  const efisiensiChartData = { labels: processedData.map(d => d.month), datasets: [ { type: 'bar', label: 'Energy GI-PLN (MWh)', data: processedData.map(d => d.energiGI), backgroundColor: '#60a5fa' }, { type: 'bar', label: 'Energy GH-PLN (MWh)', data: processedData.map(d => d.energiGH), backgroundColor: '#fb923c' }, { type: 'bar', label: 'Loss (MWh)', data: processedData.map(d => d.loss), backgroundColor: '#9ca3af' }, { type: 'line', label: 'Efisiensi (%)', data: processedData.map(d => d.efisiensi), borderColor: '#facc15', yAxisID: 'y1', tension: 0.1 } ] };

  if (loading) return <div className="p-4">Menghitung dan memuat data energi...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Monitoring Kinerja Energi</h2>
        <div>
          <label className="mr-2 text-sm font-medium">Tahun:</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded px-3 py-1">
            <option>2025</option><option>2024</option><option>2023</option>
          </select>
        </div>
      </div>
      <div className="border-b mb-4">
        <button onClick={() => setActiveTab('konsumsi')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'konsumsi' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Konsumsi Energi</button>
        <button onClick={() => setActiveTab('efisiensi')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'efisiensi' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Efisiensi Transmisi PLN</button>
      </div>
      {activeTab === 'konsumsi' && (<div className="bg-white p-4 rounded-lg border"><div className="h-[400px]"><Bar data={konsumsiChartData} options={chartOptions} /></div></div>)}
      {activeTab === 'efisiensi' && (<div className="bg-white p-4 rounded-lg border"><div className="h-[400px]"><Bar data={efisiensiChartData} options={chartOptions} /></div></div>)}
    </div>
  );
};

export default EnergyMonitoring;
