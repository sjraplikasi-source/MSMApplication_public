// src/pages/ReportEdit.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById, updateReport } from "../lib/supabase";
import InputField from "../components/InputField";
import SelectField from "../components/SelectField";
import Button from "../components/Button";

const ReportEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama_mesin: "",
    tanggal: "",
    waktu: "",
    downtime: "",
    penyebab: "",
    status: "",
    // Tambah field lain sesuai kebutuhan
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load data existing
  useEffect(() => {
    if (id) {
      getReportById(id)
        .then((data) => {
          setFormData({
            nama_mesin: data.nama_mesin ?? "",
            tanggal: data.tanggal ?? "",
            waktu: data.waktu ?? "",
            downtime: data.downtime ?? "",
            penyebab: data.penyebab ?? "",
            status: data.status ?? "",
            // Sesuaikan field lain
          });
          setLoading(false);
        })
        .catch(() => {
          setError("Gagal mengambil data laporan.");
          setLoading(false);
        });
    }
  }, [id]);

  // Handle perubahan form
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Submit update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await updateReport(id, formData);
      navigate("/validasi"); // Atau ke halaman lain sesuai kebutuhan
    } catch (err) {
      setError("Gagal mengupdate laporan.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Edit Laporan Breakdown</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Nama Mesin"
          value={formData.nama_mesin}
          onChange={(e) => handleChange("nama_mesin", e.target.value)}
        />
        <InputField
          label="Tanggal"
          type="date"
          value={formData.tanggal}
          onChange={(e) => handleChange("tanggal", e.target.value)}
        />
        <InputField
          label="Waktu"
          type="time"
          value={formData.waktu}
          onChange={(e) => handleChange("waktu", e.target.value)}
        />
        <InputField
          label="Downtime (menit)"
          type="number"
          value={formData.downtime}
          onChange={(e) => handleChange("downtime", e.target.value)}
        />
        <InputField
          label="Penyebab"
          value={formData.penyebab}
          onChange={(e) => handleChange("penyebab", e.target.value)}
        />
        <SelectField
          label="Status"
          value={formData.status}
          options={[
            { label: "Open", value: "Open" },
            { label: "Close", value: "Close" },
            // Tambah status lain jika perlu
          ]}
          onChange={(val) => handleChange("status", val)}
        />
        {/* Tambah field lain sesuai kebutuhan */}
        <div>
          <Button type="submit">Update</Button>
        </div>
      </form>
    </div>
  );
};

export default ReportEdit;
