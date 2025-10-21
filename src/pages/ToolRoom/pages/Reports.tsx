//src/pages/ToolRoom/pages/Reports.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCw, FileImage } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function ToolRoomReports() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tool_loans")
        .select("*, tools(name), employees(name, register_number)")
        .order("borrowed_at", { ascending: false });

      // Filter tanggal
      if (filter.startDate)
        query = query.gte(
          "borrowed_at",
          new Date(filter.startDate).toISOString()
        );
      if (filter.endDate)
        query = query.lte(
          "borrowed_at",
          new Date(filter.endDate).toISOString()
        );

      // Filter status
      if (filter.status) query = query.eq("status", filter.status);

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data laporan");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (records.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }

    const exportData = records.map((r) => ({
      Tool: r.tools?.name || "-",
      Employee: r.employees?.name || "-",
      "Employee ID": r.employees?.register_number || "-",
      Quantity: r.quantity,
      "Borrowed At": r.borrowed_at
        ? new Date(r.borrowed_at).toLocaleString()
        : "-",
      "Expected Return": r.expected_return_at
        ? new Date(r.expected_return_at).toLocaleString()
        : "-",
      "Returned At": r.returned_at
        ? new Date(r.returned_at).toLocaleString()
        : "-",
      Status: r.status,
      Notes: r.notes || "",
      "Return Photo": r.return_photo_url || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tool Room Reports");
    XLSX.writeFile(wb, "ToolRoom_Reports.xlsx");
  };

  const handleFilterChange = (e: any) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tool Room Reports</h1>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Status</label>
            <select
              name="status"
              value={filter.status}
              onChange={handleFilterChange}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="borrowed">Borrowed</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchRecords} disabled={loading}>
              {loading ? (
                <RefreshCw className="animate-spin h-4 w-4" />
              ) : (
                "Apply Filter"
              )}
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={records.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="py-2 px-4 text-left">Tool</th>
              <th className="py-2 px-4 text-left">Employee</th>
              <th className="py-2 px-4 text-left">Qty</th>
              <th className="py-2 px-4 text-left">Borrowed At</th>
              <th className="py-2 px-4 text-left">Expected Return</th>
              <th className="py-2 px-4 text-left">Returned At</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Return Photo</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="py-2 px-4">{r.tools?.name || "-"}</td>
                <td className="py-2 px-4">
                  {r.employees?.name || "-"}{" "}
                  <span className="text-gray-400 text-xs">
                    ({r.employees?.register_number})
                  </span>
                </td>
                <td className="py-2 px-4">{r.quantity}</td>
                <td className="py-2 px-4">
                  {r.borrowed_at
                    ? new Date(r.borrowed_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-2 px-4">
                  {r.expected_return_at
                    ? new Date(r.expected_return_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-2 px-4">
                  {r.returned_at
                    ? new Date(r.returned_at).toLocaleDateString()
                    : "-"}
                </td>
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
                <td className="py-2 px-4">
                  {r.return_photo_url ? (
                    <a
                      href={r.return_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <img
                        src={r.return_photo_url}
                        alt="Return"
                        className="h-10 w-10 object-cover rounded-md border border-gray-200 hover:opacity-80 transition"
                      />
                      <FileImage className="h-4 w-4 text-gray-400" />
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td
                  className="py-3 px-4 text-center text-gray-500"
                  colSpan={8}
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
