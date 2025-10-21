//src/pages/ToolRoom/pages/BorrowReturn.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Check, Undo2 } from "lucide-react";

interface BorrowRecord {
  id: number;
  tool_id: number;
  borrower_name: string;
  quantity: number;
  borrow_date: string;
  return_date?: string;
  status: "Borrowed" | "Returned";
  tool?: { name: string };
}

interface Tool {
  id: number;
  name: string;
  stock: number;
}

export default function BorrowReturn() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState({ tool_id: "", borrower_name: "", quantity: 1 });

  const fetchData = async () => {
    const { data: toolsData } = await supabase.from("tools").select("id, name, stock");
    const { data: borrowData } = await supabase
      .from("tool_transactions")
      .select("*, tool:tools(name)")
      .order("borrow_date", { ascending: false });

    setTools(toolsData || []);
    setRecords(borrowData || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTool = tools.find((t) => t.id === Number(form.tool_id));
    if (!selectedTool) return alert("Tool tidak ditemukan!");
    if (selectedTool.stock < Number(form.quantity)) return alert("Stok tidak cukup!");

    await supabase.from("tool_transactions").insert([
      {
        tool_id: Number(form.tool_id),
        borrower_name: form.borrower_name,
        quantity: Number(form.quantity),
        borrow_date: new Date().toISOString(),
        status: "Borrowed",
      },
    ]);

    await supabase
      .from("tools")
      .update({ stock: selectedTool.stock - Number(form.quantity), status: "Borrowed" })
      .eq("id", selectedTool.id);

    setFormVisible(false);
    setForm({ tool_id: "", borrower_name: "", quantity: 1 });
    fetchData();
  };

  const handleReturn = async (record: BorrowRecord) => {
    const tool = tools.find((t) => t.id === record.tool_id);
    if (!tool) return;

    await supabase
      .from("tool_transactions")
      .update({ status: "Returned", return_date: new Date().toISOString() })
      .eq("id", record.id);

    await supabase
      .from("tools")
      .update({ stock: tool.stock + record.quantity, status: "Available" })
      .eq("id", tool.id);

    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Peminjaman & Pengembalian</h2>
        <Button onClick={() => setFormVisible(!formVisible)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Transaksi
        </Button>
      </div>

      {formVisible && (
        <Card>
          <CardContent>
            <form onSubmit={handleBorrow} className="grid grid-cols-2 gap-4">
              <select
                name="tool_id"
                value={form.tool_id}
                onChange={(e) => setForm({ ...form, tool_id: e.target.value })}
                className="border rounded p-2"
                required
              >
                <option value="">Pilih Tool</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — Stock: {t.stock}
                  </option>
                ))}
              </select>

              <input
                name="borrower_name"
                placeholder="Nama Peminjam"
                value={form.borrower_name}
                onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                className="border rounded p-2"
                required
              />

              <input
                name="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="border rounded p-2"
              />

              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Tool</th>
                <th className="p-2 text-left">Peminjam</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-center">Tanggal Pinjam</th>
                <th className="p-2 text-center">Tanggal Kembali</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{r.tool?.name || "-"}</td>
                  <td className="p-2">{r.borrower_name}</td>
                  <td className="p-2 text-center">{r.quantity}</td>
                  <td className="p-2 text-center">{new Date(r.borrow_date).toLocaleDateString()}</td>
                  <td className="p-2 text-center">
                    {r.return_date ? new Date(r.return_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 text-center">{r.status}</td>
                  <td className="p-2 text-center">
                    {r.status === "Borrowed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReturn(r)}
                        title="Kembalikan Tool"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && <p className="text-gray-500 text-sm p-3">Belum ada transaksi.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
