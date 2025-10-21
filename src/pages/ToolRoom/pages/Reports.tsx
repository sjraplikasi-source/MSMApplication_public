//src/pages/ToolRoom/pages/Reports.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

interface Summary {
  total_tools: number;
  total_available: number;
  total_borrowed: number;
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary>({
    total_tools: 0,
    total_available: 0,
    total_borrowed: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const fetchReports = async () => {
    const { data: tools } = await supabase.from("tools").select("id, name, quantity, available_quantity");
    const { data: transactions } = await supabase
      .from("tool_loans")
      .select("*, tool:tools(name)")
      .order("borrowed_at", { ascending: false })
      .limit(10);

    if (tools) {
      setSummary({
        total_tools: tools.length,
        total_available: tools.filter((t) => (t.available_quantity ?? 0) > 0).length,
        total_borrowed: tools.filter((t) => (t.available_quantity ?? 0) < (t.quantity ?? 0)).length,
      });
    }

    setRecentTransactions(transactions || []);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Laporan Tool Room</h2>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-gray-500 text-sm">Total Tools</p>
            <p className="text-2xl font-bold">{summary.total_tools}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-gray-500 text-sm">Available</p>
            <p className="text-2xl font-bold text-green-600">{summary.total_available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-gray-500 text-sm">Borrowed</p>
            <p className="text-2xl font-bold text-blue-600">{summary.total_borrowed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">Transaksi Terbaru</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Tool</th>
                <th className="p-2 text-left">Peminjam</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Tanggal Pinjam</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{t.tool?.name}</td>
                  <td className="p-2">{t.notes}</td>
                  <td className="p-2 text-center">{t.quantity}</td>
                  <td className="p-2 text-center">{new Date(t.borrowed_at).toLocaleDateString()}</td>
                  <td className="p-2 text-center capitalize">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentTransactions.length === 0 && <p className="text-gray-500 text-sm p-3">Belum ada transaksi.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
