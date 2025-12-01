//src/pages/ToolRoom/pages/BorrowReturn.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { QrCode, Loader2, Search, X, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { useAuth } from "@/context/AuthContext";

interface Tool {
  id: string;
  name: string;
  available_quantity: number;
  category: string;
  location: string;
}

interface Employee {
  id: string;
  register_number: string;
  name: string;
  role: "admin" | "user";
}

interface SelectedTool {
  tool: Tool;
  quantity: number;
}

export default function BorrowReturn() {
  const { user: currentUser } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTools, setSelectedTools] = useState<SelectedTool[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showToolScanner, setShowToolScanner] = useState(false);
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [toolSearchFilters, setToolSearchFilters] = useState({
    name: "",
    category: "",
    location: "",
  });

  const toolsRef = useRef<HTMLDivElement>(null);
  const employeesRef = useRef<HTMLDivElement>(null);

  // === FETCH DATA ===
  useEffect(() => {
    fetchTools();
    if (currentUser?.role === "admin") {
      fetchEmployees();
    } else {
      setSelectedEmployee(currentUser || null); // auto set user sendiri
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setShowToolDropdown(false);
      }
      if (employeesRef.current && !employeesRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentUser]);

  const fetchTools = async () => {
    const { data, error } = await supabase.from("tools").select("*").gt("available_quantity", 0);
    if (error) {
      toast.error("Gagal memuat daftar tools");
      return;
    }
    setTools(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("employees").select("*");
    if (error) {
      toast.error("Gagal memuat daftar karyawan");
      return;
    }
    setEmployees(data || []);
  };

  // === FILTER TOOL ===
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const nameMatch = tool.name.toLowerCase().includes(toolSearchFilters.name.toLowerCase());
      const categoryMatch =
        !toolSearchFilters.category ||
        tool.category.toLowerCase().includes(toolSearchFilters.category.toLowerCase());
      const locationMatch =
        !toolSearchFilters.location ||
        tool.location.toLowerCase().includes(toolSearchFilters.location.toLowerCase());
      const notSelected = !selectedTools.some((selected) => selected.tool.id === tool.id);
      return nameMatch && categoryMatch && locationMatch && notSelected;
    });
  }, [tools, toolSearchFilters, selectedTools]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(tools.map((tool) => tool.category))).sort();
  }, [tools]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(tools.map((tool) => tool.location))).sort();
  }, [tools]);

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.register_number.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // === TOOL SELECTION ===
  const clearToolSearch = () => {
    setToolSearchFilters({ name: "", category: "", location: "" });
  };

  const addTool = (tool: Tool) => {
    // Non-admin hanya boleh pinjam 1 alat per transaksi
    if (currentUser?.role !== "admin" && selectedTools.length >= 1) {
      toast.error("User hanya dapat meminjam satu alat per transaksi.");
      return;
    }

    if (!selectedTools.some((s) => s.tool.id === tool.id)) {
      setSelectedTools((prev) => [...prev, { tool, quantity: 1 }]);
      clearToolSearch();
      setShowToolDropdown(false);
    }
  };

  const removeTool = (toolId: string) => {
    setSelectedTools((prev) => prev.filter((s) => s.tool.id !== toolId));
  };

  const updateToolQuantity = (toolId: string, quantity: number) => {
    setSelectedTools((prev) =>
      prev.map((s) =>
        s.tool.id === toolId
          ? {
              ...s,
              quantity: Math.min(Math.max(1, quantity), s.tool.available_quantity),
            }
          : s
      )
    );
  };

  // === SCAN BARCODE ===
  const handleToolScan = async (result: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .or(`barcode_value.eq.${result}, id.eq.${result}`)
        .gt("available_quantity", 0)
        .single();

      if (error || !data) {
        toast.error("Tool tidak ditemukan atau tidak tersedia");
        return;
      }

      addTool(data);
      setShowToolScanner(false);
    } catch {
      toast.error("Gagal membaca barcode");
    } finally {
      setLoading(false);
    }
  };

  // === SUBMIT FORM ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTools.length === 0 || !selectedEmployee || !expectedReturnDate) {
      toast.error("Harap lengkapi semua field wajib");
      return;
    }

    setLoading(true);
    try {
      for (const s of selectedTools) {
        if (s.quantity > s.tool.available_quantity) {
          toast.error(`Stok ${s.tool.name} tidak cukup`);
          return;
        }
      }

      // Admin bisa pinjam atas nama siapa saja
      const borrowerId =
        currentUser?.role === "admin" ? selectedEmployee.id : currentUser?.id;

      const loanRecords = selectedTools.map((s) => ({
        tool_id: s.tool.id,
        employee_id: borrowerId,
        quantity: s.quantity,
        expected_return_at: expectedReturnDate,
        notes,
        status: "borrowed",
      }));

      const { error } = await supabase.from("tool_loans").insert(loanRecords);
      if (error) throw error;

      // update stok tools
      for (const s of selectedTools) {
        await supabase
          .from("tools")
          .update({ available_quantity: s.tool.available_quantity - s.quantity })
          .eq("id", s.tool.id);
      }

      toast.success("Loan berhasil dibuat");
      setSelectedTools([]);
      if (currentUser?.role === "admin") setSelectedEmployee(null);
      setExpectedReturnDate("");
      setNotes("");
      fetchTools();
    } catch {
      toast.error("Gagal membuat loan");
    } finally {
      setLoading(false);
    }
  };

  // === RENDER ===
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900">Create New Loan</h2>

      {/* === TOOLS SELECTION === */}
      <div ref={toolsRef}>
        <label className="block text-sm font-medium text-gray-700">Add Tools</label>
        <div className="mt-1 relative">
          <div className="flex gap-2 mb-2">
            <div className="flex-grow space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search tools by name..."
                    value={toolSearchFilters.name}
                    onChange={(e) => {
                      setToolSearchFilters((p) => ({ ...p, name: e.target.value }));
                      setShowToolDropdown(true);
                    }}
                    onFocus={() => setShowToolDropdown(true)}
                    className="block w-full rounded-md border pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowToolScanner(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <QrCode className="h-5 w-5" />
                  Scan
                </button>
              </div>

              {/* FILTERS */}
              <div className="flex gap-2">
                <select
                  value={toolSearchFilters.category}
                  onChange={(e) =>
                    setToolSearchFilters((p) => ({ ...p, category: e.target.value }))
                  }
                  className="block w-1/2 rounded-md border py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={toolSearchFilters.location}
                  onChange={(e) =>
                    setToolSearchFilters((p) => ({ ...p, location: e.target.value }))
                  }
                  className="block w-1/2 rounded-md border py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dropdown list */}
          {showToolDropdown && filteredTools.length > 0 && (
            <ul className="absolute z-10 w-full max-h-48 overflow-auto bg-white border rounded-md shadow-lg">
              {filteredTools.map((tool) => (
                <li
                  key={tool.id}
                  onClick={() => addTool(tool)}
                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <p className="font-medium">{tool.name}</p>
                  <p className="text-sm text-gray-500">Category: {tool.category}</p>
                  <p className="text-sm text-gray-500">Location: {tool.location}</p>
                  <p className="text-sm text-gray-500">Available: {tool.available_quantity}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SELECTED TOOLS */}
      {selectedTools.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-gray-900">Selected Tools</h3>
          {selectedTools.map((s) => (
            <div
              key={s.tool.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md border"
            >
              <div>
                <p className="font-medium">{s.tool.name}</p>
                <p className="text-sm text-gray-500">
                  Category: {s.tool.category} | Location: {s.tool.location} | Available:{" "}
                  {s.tool.available_quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateToolQuantity(s.tool.id, s.quantity - 1)}
                  disabled={s.quantity <= 1}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={s.quantity}
                  min="1"
                  max={s.tool.available_quantity}
                  onChange={(e) => updateToolQuantity(s.tool.id, Number(e.target.value))}
                  className="w-16 text-center rounded-md border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => updateToolQuantity(s.tool.id, s.quantity + 1)}
                  disabled={s.quantity >= s.tool.available_quantity}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeTool(s.tool.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPLOYEE SELECTION */}
      {currentUser?.role === "admin" ? (
        <div ref={employeesRef}>
          <label className="block text-sm font-medium text-gray-700">Employee</label>
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setShowEmployeeDropdown(true);
              }}
              onFocus={() => setShowEmployeeDropdown(true)}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
            {selectedEmployee ? (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="font-medium">{selectedEmployee.name}</p>
                <p className="text-sm text-gray-500">ID: {selectedEmployee.register_number}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(null);
                    setEmployeeSearch("");
                    setShowEmployeeDropdown(true);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              showEmployeeDropdown &&
              filteredEmployees.length > 0 && (
                <ul className="absolute z-10 w-full max-h-48 overflow-auto bg-white border rounded-md shadow-lg mt-1">
                  {filteredEmployees.map((emp) => (
                    <li
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowEmployeeDropdown(false);
                      }}
                      className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-sm text-gray-500">ID: {emp.register_number}</p>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <p className="font-medium">{currentUser?.name}</p>
          <p className="text-sm text-gray-500">ID: {currentUser?.register_number}</p>
        </div>
      )}

      {/* RETURN DATE */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Expected Return Date</label>
        <input
          type="datetime-local"
          value={expectedReturnDate}
          onChange={(e) => setExpectedReturnDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* NOTES */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || selectedTools.length === 0 || !expectedReturnDate}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Loan"}
      </button>

      {showToolScanner && (
        <BarcodeScanner onScan={handleToolScan} onClose={() => setShowToolScanner(false)} />
      )}
    </form>
  );
}
