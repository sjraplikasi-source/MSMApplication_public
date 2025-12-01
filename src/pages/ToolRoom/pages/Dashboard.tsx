// src/pages/ToolRoom/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Wrench, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ToolRoomDashboard() {
  const [stats, setStats] = useState({
    totalTools: 0,
    borrowed: 0,
    available: 0,
    overdue: 0,
  });
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from("tools")
        .select("*", { count: "exact", head: true });

      const { count: borrowed } = await supabase
        .from("tool_loans")
        .select("*", { count: "exact", head: true })
        .eq("status", "borrowed");

      const { count: overdue } = await supabase
        .from("tool_loans")
        .select("*", { count: "exact", head: true })
        .eq("status", "borrowed")
        .lt("expected_return_at", new Date().toISOString());

      setStats({
        totalTools: total || 0,
        borrowed: borrowed || 0,
        overdue: overdue || 0,
        available: (total || 0) - (borrowed || 0),
      });
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat statistik");
    }
  };

  const fetchRecent = async () => {
    try {
      const { data, error } = await supabase
        .from("tool_loans")
        .select("*, tools(name)")
        .order("borrowed_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecent(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data transaksi terbaru");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tool Room Dashboard</h1>

      {/* Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Total Tools</p>
              <p className="text-2xl font-bold">{stats.totalTools}</p>
            </div>
            <Wrench className="text-blue-600 h-8 w-8" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Borrowed</p>
              <p className="text-2xl font-bold">{stats.borrowed}</p>
            </div>
            <ClipboardList className="text-yellow-600 h-8 w-8" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-2xl font-bold">{stats.available}</p>
            </div>
            <CheckCircle className="text-green-600 h-8 w-8" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <Clock className="text-red-600 h-8 w-8" />
          </CardContent>
        </Card>
      </div>

      {/* Tombol Aksi */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate("/toolroom/return-tools")} >
          Return Tools
        </Button>
        <Button onClick={() => navigate("/toolroom/reports")} variant="outline">
          Reports
        </Button>
      </div>

      {/* Daftar Transaksi Terbaru */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="py-2 px-4 text-left">Tool</th>
                <th className="py-2 px-4 text-left">Quantity</th>
                <th className="py-2 px-4 text-left">Borrower</th>
                <th className="py-2 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 px-4">{r.tools?.name || "-"}</td>
                  <td className="py-2 px-4">{r.quantity}</td>
                  <td className="py-2 px-4">{r.employee_id || "-"}</td>
                  <td
                    className={`py-2 px-4 font-semibold ${
                      r.status === "returned"
                        ? "text-green-600"
                        : r.status === "borrowed"
                        ? "text-yellow-600"
                        : "text-gray-600"
                    }`}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td
                    className="py-3 px-4 text-center text-gray-500"
                    colSpan={4}
                  >
                    No recent transactions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
