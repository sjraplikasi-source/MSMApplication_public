//src/pages/ToolRoom/components/ToolForm.tsx
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ToolFormProps {
  existingTool?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ToolForm({ existingTool, onClose, onSaved }: ToolFormProps) {
  const [form, setForm] = useState({
    name: existingTool?.name || "",
    category: existingTool?.category || "",
    stock: existingTool?.stock || 0,
    location: existingTool?.location || "",
    status: existingTool?.status || "Available",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingTool) {
      await supabase.from("tools").update(form).eq("id", existingTool.id);
    } else {
      await supabase.from("tools").insert([form]);
    }
    onSaved();
  };

  return (
    <Card className="mb-4">
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input name="name" placeholder="Nama Tool" value={form.name} onChange={handleChange} className="border rounded p-2" required />
          <input name="category" placeholder="Kategori" value={form.category} onChange={handleChange} className="border rounded p-2" required />
          <input name="location" placeholder="Lokasi" value={form.location} onChange={handleChange} className="border rounded p-2" />
          <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} className="border rounded p-2" />
          <select name="status" value={form.status} onChange={handleChange} className="border rounded p-2">
            <option value="Available">Available</option>
            <option value="Borrowed">Borrowed</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
