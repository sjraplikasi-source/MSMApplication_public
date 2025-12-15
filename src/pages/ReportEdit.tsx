// =============================
// src/pages/ReportEdit.tsx
// =============================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // Pastikan import supabase client
import InputField from "../components/InputField";
import SelectField from "../components/SelectField";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext"; // Import AuthContext

const ReportEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Ambil data user (GL)

  const [formData, setFormData] = useState({
    nama_mesin: "",
    tanggal: "",
    waktu: "",
    downtime: "",
    penyebab: "",
    status: "", // Status ini penting untuk logic tombol
    // field lainnya...
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // State untuk loading saat simpan
  const [error, setError] = useState("");

  // Load data existing
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
            nama_mesin: data.nama_mesin ?? "",
            tanggal: data.tanggal ?? "",
            waktu: data.waktu ?? "",
            downtime: data.downtime ?? "",
            penyebab: data.penyebab ?? "",
            status: data.status ?? "",
            // map field lainnya...
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

  // --- FUNGSI 1: HANYA SIMPAN (Draft / Edit Biasa) ---
  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);
    setError("");

    try {
      const { error } = await supabase
        .from('repair_reports')
        .update({
            // Update field sesuai formData
            nama_mesin: formData.nama_mesin,
            tanggal: formData.tanggal,
            waktu: formData.waktu,
            downtime: formData.downtime,
            penyebab: formData.penyebab,
            // JANGAN update status di sini jika tujuannya hanya edit konten
            // Atau biarkan status apa adanya
        })
        .eq('id', id);

      if (error) throw error;
      
      // Jika edit biasa, kembalikan ke halaman sebelumnya (bisa validasi atau list report)
      navigate(-1); 
    } catch (err: any) {
      setError("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- FUNGSI 2: SIMPAN DAN LANGSUNG VALIDASI ---
  const handleSaveAndValidate = async () => {
    if (!id || !user) return;

    // Konfirmasi dulu agar tidak kepencet
    if (!window.confirm("Apakah Anda yakin data sudah benar dan ingin menyetujui laporan ini?")) return;

    setSaving(true);
    setError("");

    try {
      const { error } = await supabase
        .from('repair_reports')
        .update({
            // 1. Update data form (jika ada perbaikan typo dll)
            nama_mesin: formData.nama_mesin,
            tanggal: formData.tanggal,
            waktu: formData.waktu,
            downtime: formData.downtime,
            penyebab: formData.penyebab,

            // 2. Sekalian Update Status Approval
            status: 'approved',
            approved_by: user.id,
            approved_by_id: user.id, // Sesuaikan dengan kolom di DB kamu
            approved_name: user.full_name || user.email
        })
        .eq('id', id);

      if (error) throw error;

      // Redirect KHUSUS ke halaman Validasi agar GL melihat list berkurang
      navigate("/validasi"); 

    } catch (err: any) {
      setError("Gagal memvalidasi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Edit Laporan Breakdown</h2>
      
      {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSaveOnly} className="space-y-4">
        {/* ... Input Fields (Sama seperti code kamu sebelumnya) ... */}
        
        <InputField
          label="Penyebab"
          value={formData.penyebab}
          onChange={(e) => handleChange("penyebab", e.target.value)}
        />
        
        {/* Note: SelectField Status mungkin sebaiknya di-disable atau di-hide 
            jika user adalah GL yang sedang memvalidasi, biar tidak manual ganti status lewat dropdown */}

        <div className="flex gap-4 pt-4 border-t mt-6">
            {/* TOMBOL 1: Selalu muncul (Simpan Perubahan / Draft) */}
            <Button 
                type="submit" 
                className="bg-gray-600 hover:bg-gray-700 text-white"
                disabled={saving}
            >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>

            {/* TOMBOL 2: Hanya muncul jika status masih SUBMITTED (Butuh Validasi) */}
            {formData.status === 'submitted' && (
                <button
                    type="button" // Type button agar tidak trigger onSubmit form
                    onClick={handleSaveAndValidate}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    {saving ? 'Memproses...' : 'Simpan & Setujui (Validate)'}
                </button>
            )}
        </div>
      </form>
    </div>
  );
};

export default ReportEdit;