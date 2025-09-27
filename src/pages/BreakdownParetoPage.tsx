import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Tabs, Tab } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { supabase } from '../lib/supabase';

interface BreakdownData {
  label: string;
  duration: number;
  cumulativePercent: number;
}

const ParetoChart = ({ data, title }: { data: BreakdownData[]; title: string }) => {
  console.log('Pareto Data:', data);
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
              type="number"$1
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              allowDataOverflow
              label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }}
            />
            <ReferenceLine y={80} yAxisId="right" stroke="green" strokeDasharray="5 5" label={{ value: '80% Threshold', position: 'left', fill: 'green' }} />
            <Tooltip />
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
              animationDuration={800}
              strokeDasharray="0"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default function BreakdownParetoPage() {
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-14');
  const [areaData, setAreaData] = useState<BreakdownData[]>([]);
  const [componentData, setComponentData] = useState<BreakdownData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('repair_reports')
        .select('area(name), sub_component(name), duration, start_date')
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      if (!data) return;

      const groupAndCalculate = (key: 'area' | 'sub_component') => {
        const map: Record<string, number> = {};
        data.forEach((d) => {
          const label = d[key]?.name || 'Unknown';
          const dur = Number(d.duration);
          map[label] = (map[label] || 0) + (isNaN(dur) ? 0 : dur);
        });

        const sorted = Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([label, duration]) => ({ label, duration }));

        let total = sorted.reduce((sum, d) => sum + d.duration, 0);
        if (total === 0) total = 1;

        let cumulative = 0;
        const calculated = sorted.map((item) => {
          cumulative += item.duration;
          return {
            label: item.label,
            duration: item.duration,
            cumulativePercent: parseFloat(((cumulative / total) * 100).toFixed(2))
          };
        });
        console.log('CALCULATED', key, calculated);
        return calculated;
      };

      setAreaData(groupAndCalculate('area'));
      setComponentData(groupAndCalculate('sub_component'));
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-3 py-1 rounded"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-3 py-1 rounded"
          />
        </div>
      </div>

      <Tabs defaultValue="area">
        <Tab value="area" label="By Area">
          <ParetoChart data={areaData} title={`Pareto Breakdown by Area (${startDate} - ${endDate})`} />
        </Tab>
        <Tab value="component" label="By Sub Component">
          <ParetoChart data={componentData} title={`Pareto Breakdown by Component (${startDate} - ${endDate})`} />
        </Tab>
      </Tabs>
    </div>
  );
}
