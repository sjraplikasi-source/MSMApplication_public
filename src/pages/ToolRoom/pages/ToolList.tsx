// src/pages/ToolRoom/pages/ToolList.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";

import ToolForm from "../components/ToolForm";

interface ToolItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  location: string;
  status: string;
}

export default function ToolList() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);

  // Ambil data dari Supabase
  const fetchTools = async () => {
    const { data, error } = await supabase.from("tools").select("*").order("name", { ascending: true });
    if (error) console.error("Error loading tools:", error);
    else setTools(data || []);
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus tool ini?")) return;
    const { error } = await supabase.from("tools").delete().eq("id", id);
    if (error) console.error("Error deleting:", error);
    fetchTools();
  };

  const handleEdit = (tool: ToolItem) => {
    setEditingTool(tool);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Daftar Tools</h2>
        <Button onClick={() => { setEditingTool(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Tool
        </Button>
      </div>

      {showForm && (
        <ToolForm
          existingTool={editingTool}
          onClose={() => setShowForm(false)}
          onSaved={() => { fetchTools(); setShowForm(false); }}
        />
      )}

      <Card>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Nama Tool</th>
                <th className="text-left p-2">Kategori</th>
                <th className="text-left p-2">Lokasi</th>
                <th className="text-center p-2">Stock</th>
                <th className="text-center p-2">Status</th>
                <th className="text-center p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{t.name}</td>
                  <td className="p-2">{t.category}</td>
                  <td className="p-2">{t.location}</td>
                  <td className="p-2 text-center">{t.stock}</td>
                  <td className="p-2 text-center">{t.status}</td>
                  <td className="p-2 text-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tools.length === 0 && <p className="text-gray-500 text-sm p-3">Belum ada data tools.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
