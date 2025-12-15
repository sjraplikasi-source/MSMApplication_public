// =============================
// src/pages/ReportEdit.tsx
// =============================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; 
import InputField from "../components/InputField";
import SelectField from "../components/SelectField"; // Jika dipakai
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext"; 

const ReportEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 

  // State untuk data form
  const [formData, setFormData] = useState({
    // Sesuaikan field dengan tabel repair_reports
    part_number: "",
    start_date: "",
    start_hour: "",
    finish_date: "",
    finish_hour: "",
    area: "",
    hour_meter: "",
    mechanic_comment: "",
    problem_description: "",
    part_causing_failure: "",
    duration: "",
    status: "", 
    approved_by: null as string | null, // <--- INI KUNCI LOGIKA KITA
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Load Data Existing
  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        const { data, error } = await supabase
          .from('repair_reports')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          setError("Gagal mengambil data laporan.");
        } else if (data) {
          setFormData({
            part_number: data.part_number ?? "",
            start_date: data.start_date ?? "",
            start_hour: data.start_hour ?? "",
            finish_date: data.finish_date ?? "",
            finish_hour: data.finish_hour ?? "",
            area: data.area ?? "",
            hour_meter: data.hour_meter ?? "",
            mechanic_comment: data.mechanic_comment ?? "",
            problem_description: data.problem_description ?? "",
            part_causing_failure: data.part_causing_failure ?? "",
            duration: data.duration ?? "",
            status: data.status ?? "",
            approved_by: data.approved_by, // Ambil data approved_by dari DB
          });
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- FUNGSI 1: SIMPAN PERUBAHAN (Tanpa Validasi) ---
  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);
    setError("");

    try {
      const { error } = await supabase
        .from('repair_reports')
        .update({
            part_number: formData.part_number,
            start_date: formData.start_date,
            start_hour: formData.start_hour,
            finish_date: formData.finish_date,
            finish_hour: formData.finish_hour,
            area: formData.area,
            hour_meter: formData.hour_meter ? parseInt(formData.hour_meter) : null,
            mechanic_comment: formData.mechanic_comment,
            problem_description: formData.problem_description,
            part_causing_failure: formData.part_causing_failure,
            // Status TIDAK diubah di sini, biarkan apa adanya
        })
        .eq('id', id);

      if (error) throw error;
      
      navigate(-1); // Kembali ke halaman sebelumnya
    } catch (err: any) {
      setError("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- FUNGSI 2: SIMPAN & SETUJUI (VALIDASI) ---
  const handleSaveAndValidate = async () => {
    if (!id || !user) return;

    if (!window.confirm("Apakah data sudah benar? Laporan akan disetujui (Approved).")) return;

    setSaving(true);
    setError("");

    try {
      const { error } = await supabase
        .from('repair_reports')
        .update({
            // 1. Update data form (sekalian simpan editan)
            part_number: formData.part_number,
            start_date: formData.start_date,
            start_hour: formData.start_hour,
            finish_date: formData.finish_date,
            finish_hour: formData.finish_hour,
            mechanic_comment: formData.mechanic_comment,
            problem_description: formData.problem_description,
            part_causing_failure: formData.part_causing_failure,
            
            // 2. SET DATA APPROVAL (Sesuai Struktur Tabel)
            status: 'approved',
            approved_by: user.id,      // UUID user yang login
            approved_by_id: user.id,   // UUID user yang login (sesuai tabel ada 2 kolom mirip)
            approved_name: user.user_metadata?.full_name || user.email // Ambil nama
        })
        .eq('id', id);

      if (error) throw error;

      // Redirect ke halaman Validasi agar User melihat list berkurang
      navigate("/validasi"); 

    } catch (err: any) {
      setError("Gagal memvalidasi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading data...</div>;

  // Cek apakah user sudah approve sebelumnya
  // Logic: Jika approved_by NULL (kosong), berarti BELUM divalidasi.
  const needsValidation = !formData.approved_by; 

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Laporan Breakdown rev1</h2>
      
      {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded border border-red-200">{error}</div>}

      <form onSubmit={handleSaveOnly} className="space-y-4">
        
        {/* Contoh Input Fields - Sesuaikan dengan kebutuhan */}
        <InputField
          label="Deskripsi Masalah"
          value={formData.problem_description}
          onChange={(e) => handleChange("problem_description", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
            <InputField
            label="Tanggal Mulai"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            />
            <InputField
            label="Jam Mulai"
            type="time"
            value={formData.start_hour}
            onChange={(e) => handleChange("start_hour", e.target.value)}
            />
        </div>

        <InputField
          label="Part Number"
          value={formData.part_number}
          onChange={(e) => handleChange("part_number", e.target.value)}
        />
        
        <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Komentar Mekanik</label>
            <textarea 
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                value={formData.mechanic_comment}
                onChange={(e) => handleChange("mechanic_comment", e.target.value)}
            />
        </div>

        {/* --- AREA TOMBOL --- */}
        <div className="flex gap-4 pt-6 border-t mt-8">
            {/* 1. Tombol Simpan Perubahan (Selalu Muncul) */}
            <Button 
                type="submit" 
                className="bg-gray-600 hover:bg-gray-700 text-white w-1/2"
                disabled={saving}
            >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>

            {/* 2. Tombol Validasi (Hanya muncul jika approved_by KOSONG) */}
            {needsValidation && (
                <button
                    type="button" 
                    onClick={handleSaveAndValidate}
                    disabled={saving}
                    className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors flex justify-center items-center gap-2"
                >
                    {saving ? 'Memproses...' : (
                        <>
                           <span>Simpan & Setujui</span>
                           <span className="text-xs bg-green-800 px-2 py-0.5 rounded text-green-100">Validate</span>
                        </>
                    )}
                </button>
            )}
        </div>
      </form>
    </div>
  );
};

export default ReportEdit;