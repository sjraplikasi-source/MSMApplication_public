// src/pages/BreakdownParetoPage.tsx

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Tabs, Tab } from "../../components/ui/tabs"; // Path diubah ke root project
import { Card, CardContent } from "../../components/ui/card"; // Path diubah ke root project
import { supabase } from '../../lib/supabase'; // Path diubah ke root project
import { format, startOfMonth } from 'date-fns';

interface BreakdownData {
  label: string;
  duration: number;
  cumulativePercent: number;
}

// --- Komponen Chart dengan Garis Pareto ---
const ParetoChart = ({ data, title }: { data: BreakdownData[]; title: string }) => {
  // console.log('Pareto Data:', data); // Dibiarkan jika masih perlu debugging
  return (
    <Card className="p-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} syncId="paretoChart">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-30} textAnchor="end" height={80} interval={0} tick={{ fontSize: 8 }}/>
            <YAxis
              yAxisId="left"
              orientation="left"
              label={{ value: 'Duration (hours)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              type="number"
              orientation="right"
              domain={[0, 100]} // Skala 0-100 untuk persentase
              ticks={[0, 20, 40, 60, 80, 100]}
              allowDataOverflow
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }}
            />
            <ReferenceLine y={80} yAxisId="right" stroke="green" strokeDasharray="5 5" label={{ value: '80% Threshold', position: 'left', fill: 'green' }} />
            <Tooltip
              formatter={(value, name, props) => {
                // Custom formatter untuk tooltip
                if (name === "Cumulative %") {
                  return [`${value}%`, name]; // Tambah '%' untuk persentase
                }
                return [`${value} hours`, name]; // Tambah 'hours' untuk durasi
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="duration" fill="#1E90FF" name="Duration (hours)" />
            {/* --- INI PENAMBAHAN UNTUK GARIS PARETO --- */}
            <Line
              yAxisId="right"
              type="monotone" // Bentuk garis (monotone smooth curve)
              dataKey="cumulativePercent" // Data yang digunakan untuk garis
              stroke="#FF0000" // Warna garis
              name="Cumulative %" // Nama di legend
              strokeWidth={3}
              dot={{ r: 4 }} // Titik-titik di garis
              activeDot={{ r: 7 }} // Titik aktif saat dihover
              animationDuration={800}
              strokeDasharray="0" // Garis solid
              isAnimationActive={false} // Matikan animasi jika tidak diperlukan untuk performa
            />
            {/* --- AKHIR PENAMBAHAN --- */}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ... (sisa kode BreakdownParetoPage tetap sama) ...
const today = new Date();
const defaultStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
const defaultEndDate = format(today, 'yyyy-MM-dd');

export default function BreakdownParetoPage() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  
  const [areaData, setAreaData] = useState<BreakdownData[]>([]);
  const [componentData, setComponentData] = useState<BreakdownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (new Date(endDate) < new Date(startDate)) {
        console.error("End date cannot be before start date.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('repair_reports')
        .select('area(name), sub_component(name), duration, start_date')
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      if (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const groupAndCalculate = (key: 'area' | 'sub_component') => {
        const map: Record<string, number> = {};
        data.forEach((d) => {
          // @ts-ignore
          const label = d[key]?.name || 'Unknown';
          const dur = Number(d.duration);
          map[label] = (map[label] || 0) + (isNaN(dur) ? 0 : dur);
        });

        const sorted = Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([label, duration]) => ({ label, duration: parseFloat(duration.toFixed(2)) }));

        let total = sorted.reduce((sum, d) => sum + d.duration, 0);
        if (total === 0) total = 1;

        let cumulative = 0;
        const calculated = sorted.map((item) => {
          cumulative += item.duration;
          return {
            ...item,
            cumulativePercent: parseFloat(((cumulative / total) * 100).toFixed(2))
          };
        });
        return calculated;
      };

      setAreaData(groupAndCalculate('area'));
      setComponentData(groupAndCalculate('sub_component'));
      setLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex flex-col">
          <label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="end-date" className="text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="border border-gray-300 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Memuat data Pareto...</p>
        </div>
      ) : (
        <Tabs defaultValue="area">
          <Tab value="area" label="By Area">
            <ParetoChart data={areaData} title={`Pareto Breakdown by Area (${startDate} - ${endDate})`} />
          </Tab>
          <Tab value="component" label="By Sub Component">
            <ParetoChart data={componentData} title={`Pareto Breakdown by Component (${startDate} - ${endDate})`} />
          </Tab>
        </Tabs>
      )}
    </div>
  );
}


