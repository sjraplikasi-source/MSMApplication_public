// src/pages/ToolRoom/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowUpDown, Plus, RotateCw } from "lucide-react";

type Tool = {
  id: string;
  name: string;
  quantity?: number;
  available_quantity?: number;
  category?: string;
  location?: string;
};

type Loan = {
  id: string;
  tool_id: string;
  employee_id?: string;
  quantity: number;
  borrowed_at: string | null;
  expected_return_at: string | null;
  returned_at?: string | null;
  status: "borrowed" | "returned";
  notes?: string | null;
  tool?: { name?: string };
  employee?: { name?: string; register_number?: string };
};

export default function Dashboard() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [overdueList, setOverdueList] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state: search, filter, sort, pagination
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "borrowed" | "returned">("all");
  const [sortBy, setSortBy] = useState<"borrowed_at" | "expected_return_at">("borrowed_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchAll();
    // subscribe realtime updates (optional)
    const channel = supabase
      .channel("public:tool_loans_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tool_loans" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("id, name, quantity, available_quantity, category, location");

      if (toolsError) throw toolsError;
      setTools(toolsData || []);

      const { data: loansData, error: loansError } = await supabase
        .from("tool_loans")
        .select("*, tool:tools(name), employee:employees(name,register_number)")
        .order("borrowed_at", { ascending: false });

      if (loansError) throw loansError;
      setLoans(loansData || []);

      const nowISO = new Date().toISOString();
      const overdue = (loansData || []).filter(
        (l: any) => l.status === "borrowed" && l.expected_return_at && l.expected_return_at < nowISO
      );
      setOverdueList(overdue.slice(0, 5)); // show top 5 overdue
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Gagal memuat data Tool Room");
    } finally {
      setLoading(false);
    }
  };

  const totalTools = tools.length;
  const totalAvailable = tools.reduce((s, t) => s + (t.available_quantity || 0), 0);
  const totalActiveLoans = loans.filter((l) => l.status === "borrowed").length;
  const totalOverdue = loans.filter(
    (l) => l.status === "borrowed" && l.expected_return_at && l.expected_return_at < new Date().toISOString()
  ).length;

  const filteredLoans = useMemo(() => {
    let arr = loans.slice();

    // filter by status
    if (statusFilter !== "all") arr = arr.filter((l) => l.status === statusFilter);

    // search by employee name, register, or tool name
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((l) => {
        const empName = l.employee?.name?.toLowerCase() || "";
        const empReg = l.employee?.register_number?.toLowerCase() || "";
        const toolName = l.tool?.name?.toLowerCase() || "";
        const notes = (l.notes || "").toLowerCase();
        return empName.includes(q) || empReg.includes(q) || toolName.includes(q) || notes.includes(q);
      });
    }

    // sort
    arr.sort((a, b) => {
      const aVal = (a[sortBy] || "") as string;
      const bVal = (b[sortBy] || "") as string;
      if (!aVal && !bVal) return 0;
      if (!aVal) return sortDir === "asc" ? -1 : 1;
      if (!bVal) return sortDir === "asc" ? 1 : -1;
      const av = new Date(aVal).getTime();
      const bv = new Date(bVal).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return arr;
  }, [loans, query, statusFilter, sortBy, sortDir]);

  // Format date for display
  const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  // Handle return single loan
  const handleReturn = async (loan: Loan) => {
    const ok = window.confirm(`Konfirmasi: kembalikan "${loan.tool?.name || ''}" dari ${loan.employee?.name || 'Borrower'} ?`);
    if (!ok) return;
    setLoading(true);
    try {
      // update loan status
      const { error: updateLoanErr } = await supabase
        .from("tool_loans")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", loan.id);

      if (updateLoanErr) throw updateLoanErr;

      // update tool available_quantity (+ loan.quantity)
      if (loan.tool_id) {
        // first fetch current available_quantity
        const { data: toolData, error: toolErr } = await supabase
          .from("tools")
          .select("available_quantity")
          .eq("id", loan.tool_id)
          .single();

        if (toolErr) throw toolErr;

        const newAvailable = (toolData?.available_quantity || 0) + (loan.quantity || 0);

        const { error: updToolErr } = await supabase
          .from("tools")
          .update({ available_quantity: newAvailable })
          .eq("id", loan.tool_id);

        if (updToolErr) throw updToolErr;
      }

      toast.success("Tool berhasil dikembalikan");
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses pengembalian");
    } finally {
      setLoading(false);
    }
  };

  // Return many selected feature could be added later - for now single return.

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tool Loans</h1>
        <div className="flex items-center gap-3">
          <Link to="/toolroom/borrow">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Loan
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <h3 className="text-sm font-medium text-gray-500">Tool Status</h3>
            <div className="mt-3">
              <div className="flex justify-between">
                <div className="text-sm text-gray-600">Total Tools:</div>
                <div className="font-bold">{totalTools}</div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-sm text-gray-600">Available:</div>
                <div className="font-bold text-green-600">{totalAvailable}</div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-sm text-gray-600">Borrowed (active loans):</div>
                <div className="font-bold text-blue-600">{totalActiveLoans}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-medium text-gray-500">Active Loans</h3>
            <div className="mt-3">
              <div className="flex justify-between">
                <div className="text-sm text-gray-600">Total Active:</div>
                <div className="font-bold">{totalActiveLoans}</div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-sm text-gray-600">Overdue:</div>
                <div className="font-bold text-red-600">{totalOverdue}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-medium text-gray-500">Overdue Loans</h3>
            <div className="mt-3 space-y-2">
              {overdueList.length === 0 ? (
                <div className="text-sm text-gray-500">No overdue loans</div>
              ) : (
                overdueList.map((o) => (
                  <div key={o.id} className="text-sm">
                    <div className="font-medium">{o.employee?.name} - {o.tool?.name}</div>
                    <div className="text-xs text-red-600">Due: {fmtDate(o.expected_return_at)}</div>
                  </div>
                ))
              )}
              {totalOverdue > overdueList.length && (
                <div className="text-sm text-red-500 mt-2">+{totalOverdue - overdueList.length} more overdue</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search / filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <Input
            placeholder="Search tools or employees..."
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select onValueChange={(val) => setStatusFilter(val as any)} value={statusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="borrowed">Borrowed</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(val) => setSortBy(val as any)} value={sortBy}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrowed_at">Borrow Date</SelectItem>
              <SelectItem value="expected_return_at">Expected Return</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortDir === "desc" ? "Desc" : "Asc"}
          </button>

          <button onClick={() => fetchAll()} className="inline-flex items-center gap-1 px-3 py-2 rounded-md border">
            <RotateCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Loans table */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">Tool Loans</h3>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Borrowed At</th>
                  <th className="py-3 px-4">Expected Return</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((l) => {
                  const isOverdue =
                    l.status === "borrowed" &&
                    l.expected_return_at &&
                    new Date(l.expected_return_at) < new Date();
                  return (
                    <tr key={l.id} className={`${isOverdue ? "bg-red-50" : ""} border-b`}>
                      <td className="py-3 px-4">
                        <div className="font-medium">{l.employee?.name || "-"}</div>
                        <div className="text-sm text-gray-500">{l.employee?.register_number || ""}</div>
                      </td>
                      <td className="py-3 px-4 text-center">{l.quantity}</td>
                      <td className="py-3 px-4 text-center">{fmtDate(l.borrowed_at)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                          {fmtDate(l.expected_return_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            l.status === "returned" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {l.status}
                          {isOverdue ? " (Overdue)" : ""}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{l.notes || "-"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {l.status === "borrowed" && (
                            <button onClick={() => handleReturn(l)} className="text-blue-600 hover:underline">
                              Return
                            </button>
                          )}
                          <Link to={`/toolroom/return/${l.id}`} className="text-gray-600 hover:underline">
                            View Return
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLoans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      No loans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
