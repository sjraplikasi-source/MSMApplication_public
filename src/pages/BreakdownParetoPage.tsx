// src/pages/BreakdownParetoPage.tsx

import React, { useEffect, useState } from 'react';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Line, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
// --- PERBAIKAN: Menggunakan path relatif '../' ---
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../components/ui/tabs"; // Path diubah ke ../
import { Card, CardContent } from "../components/ui/card"; // Path diubah ke ../
import { supabase } from '../lib/supabase'; // Path diubah ke ../
// ---
import { format, startOfMonth } from 'date-fns';

// --- Tipe Data (Tidak berubah) ---
interface BreakdownData {
  label: string;
  duration: number;
  cumulativePercent: number;
}

// --- Komponen Chart (Tidak berubah) ---
const ParetoChart = ({ data, title }: { data: BreakdownData[]; title: string }) => {
  return (
    <Card className="p-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} syncId="paretoChart">
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
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              allowDataOverflow
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }}
            />
            <ReferenceLine y={80} yAxisId="right" stroke="green" strokeDasharray="5 5" label={{ value: '80% Threshold', position: 'left', fill: 'green' }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "Cumulative %") return [`${value.toFixed(2)}%`, name];
                if (name === "Duration (hours)") return [`${value.toFixed(2)} hours`, name];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="duration" fill="#1E90FF" name="Duration (hours)" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercent"
              stroke="#FF0000"
              name="Cumulative %"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// --- Tanggal Default (Tidak berubah) ---
const today = new Date();
const defaultStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
const defaultEndDate = format(today, 'yyyy-MM-dd');

// --- Komponen Halaman Utama ---
export default function BreakdownParetoPage() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  
  const [areaData, setAreaData] = useState<BreakdownData[]>([]);
  const [componentData, setComponentData] = useState<BreakdownData[]>([]);
  const [loading, setLoading] = useState(true);

  // --- useEffect (Tidak berubah) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (new Date(endDate) < new Date(startDate)) {
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
      {/* Kontrol Tanggal (Tidak berubah) */}
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

      {/* Struktur Tab shadcn/ui (Tidak berubah) */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Memuat data Pareto...</p>
        </div>
      ) : (
        <Tabs defaultValue="area" className="w-full">
          {/* Ini adalah tombol Tab-nya */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="area">By Area</TabsTrigger>
            <TabsTrigger value="component">By Sub Component</TabsTrigger>
          </TabsList>
          
          {/* Ini adalah konten untuk tiap Tab */}
          <TabsContent value="area">
            <ParetoChart data={areaData} title={`Pareto R&M Activity by Area (${startDate} - ${endDate})`} />
          </TabsContent>
          <TabsContent value="component">
            <ParetoChart data={componentData} title={`Pareto R&M Activity by Component (${startDate} - ${endDate})`} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}



