// src/pages/ToolRoom/pages/ToolList.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Tool {
  id: string;
  name: string;
  quantity: number;
  available_quantity: number;
  category: string;
  location: string;
  description?: string;
}

export default function ToolList() {
  const { user: currentUser } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [newTool, setNewTool] = useState({
    name: "",
    quantity: "",
    category: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("tools").select("*").order("name");
    if (error) {
      toast.error("Gagal memuat data tools");
      return;
    }
    setTools(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTool) {
        const { error } = await supabase
          .from("tools")
          .update({
            name: newTool.name,
            category: newTool.category,
            location: newTool.location,
            quantity: parseInt(newTool.quantity),
            available_quantity: parseInt(newTool.quantity),
            description: newTool.description,
          })
          .eq("id", editingTool.id);

        if (error) throw error;
        toast.success("Tool berhasil diperbarui");
      } else {
        const { error } = await supabase.from("tools").insert([
          {
            name: newTool.name,
            category: newTool.category,
            location: newTool.location,
            quantity: parseInt(newTool.quantity),
            available_quantity: parseInt(newTool.quantity),
            description: newTool.description,
          },
        ]);

        if (error) throw error;
        toast.success("Tool baru berhasil ditambahkan");
      }

      setShowForm(false);
      setEditingTool(null);
      setNewTool({
        name: "",
        quantity: "",
        category: "",
        location: "",
        description: "",
      });
      fetchTools();
    } catch {
      toast.error("Gagal menyimpan data tool");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setNewTool({
      name: tool.name,
      quantity: tool.quantity.toString(),
      category: tool.category,
      location: tool.location,
      description: tool.description || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus tool ini?")) return;

    const { error } = await supabase.from("tools").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus tool");
      return;
    }

    toast.success("Tool berhasil dihapus");
    fetchTools();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tool List</h1>

      {/* Tombol Tambah hanya muncul untuk Admin */}
      {currentUser?.role === "admin" && (
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingTool(null);
            setNewTool({
              name: "",
              quantity: "",
              category: "",
              location: "",
              description: "",
            });
          }}
          className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Tool
        </Button>
      )}

      {/* Table List */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Location</th>
                <th className="text-left px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Available</th>
                <th className="text-left px-4 py-2">Description</th>
                {/* Kolom aksi hanya untuk admin */}
                {currentUser?.role === "admin" && (
                  <th className="text-left px-4 py-2">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{tool.name}</td>
                  <td className="px-4 py-2">{tool.category}</td>
                  <td className="px-4 py-2">{tool.location}</td>
                  <td className="px-4 py-2">{tool.quantity}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      tool.available_quantity > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tool.available_quantity}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{tool.description || "-"}</td>
                  {currentUser?.role === "admin" && (
                    <td className="px-4 py-2 flex gap-3">
                      <button
                        onClick={() => handleEdit(tool)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit2 className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tool.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {tools.length === 0 && (
                <tr>
                  <td colSpan={currentUser?.role === "admin" ? 7 : 6} className="text-center py-4 text-gray-500">
                    {loading ? "Loading..." : "No tools found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal Form Add/Edit */}
      {showForm && currentUser?.role === "admin" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingTool ? "Edit Tool" : "Add New Tool"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tool Name</label>
                <input
                  type="text"
                  value={newTool.name}
                  onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                  required
                  className="w-full border rounded-md px-3 py-2 mt-1"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={newTool.category}
                    onChange={(e) => setNewTool({ ...newTool, category: e.target.value })}
                    required
                    className="w-full border rounded-md px-3 py-2 mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={newTool.location}
                    onChange={(e) => setNewTool({ ...newTool, location: e.target.value })}
                    required
                    className="w-full border rounded-md px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={newTool.quantity}
                    onChange={(e) => setNewTool({ ...newTool, quantity: e.target.value })}
                    required
                    className="w-full border rounded-md px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTool.description}
                  onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
