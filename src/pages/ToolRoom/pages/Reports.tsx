//src/pages/ToolRoom/pages/Reports.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

interface Summary {
  total_tools: number;
  total_borrowed: number;
  total_available: number;
  total_maintenance: number;
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary>({
    total_tools: 0,
    total_borrowed: 0,
    total_available: 0,
    total_maintenance: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const fetchReports = async () => {
    const { data: tools } = await supabase.from("tools").select("*");
    const { data: transactions } = await supabase
      .from("tool_transactions")
      .select("*, tool:tools(name)")
      .order("borrow_date", { ascending: false })
      .limit(10);

    if (tools) {
      setSummary({
        total_tools: tools.length,
        total_borrowed: tools.filter((t) => t.status === "Borrowed").length,
        total_available: tools.filter((t) => t.status === "Available").length,
        total_maintenance: tools.filter((t) => t.status === "Maintenance").length,
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

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-gray-500 text-sm">Total Tools</p><p className="text-2xl font-bold">{summary.total_tools}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-gray-500 text-sm">Available</p><p className="text-2xl font-bold text-green-600">{summary.total_available}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-gray-500 text-sm">Borrowed</p><p className="text-2xl font-bold text-blue-600">{summary.total_borrowed}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-gray-500 text-sm">Maintenance</p><p className="text-2xl font-bold text-orange-600">{summary.total_maintenance}</p></CardContent></Card>
      </div>

      {/* Recent Transactions */}
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
                  <td className="p-2">{t.borrower_name}</td>
                  <td className="p-2 text-center">{t.quantity}</td>
                  <td className="p-2 text-center">{new Date(t.borrow_date).toLocaleDateString()}</td>
                  <td className="p-2 text-center">{t.status}</td>
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
