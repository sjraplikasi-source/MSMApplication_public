// =============================
// src/pages/ReportEdit.tsx
// =============================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; 
import InputField from "../components/InputField";
import SelectField from "../components/SelectField"; 
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext"; 

// Tipe data opsi dropdown
type Option = { label: string; value: string };

const ReportEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 

  // --- STATE DATA FORM LENGKAP ---
  const [formData, setFormData] = useState({
    wo_number: "",
    equipment_id: "",
    problem_description: "",
    part_causing_failure: "",
    start_date: "",
    start_hour: "",
    finish_date: "",
    finish_hour: "",
    hour_meter: "",
    shift: "",
    group_leader_id: "", // Asumsi ada field ini
    manpower_ids: [], // Asumsi array untuk multi-select
    failure_id: "",
    diagnosis_id: "",
    reason_id: "",
    finding_id: "",
    area_id: "",
    action_id: "",
    instruction_id: "",
    sub_component_id: "",
    problems_id: "",
    activity_id: "",
    activity_type_id: "",
    mechanic_comment: "",
    status_breakdown: "",
    activity_status: "",
    
    // Field System
    status: "", 
    approved_by: null as string | null,
  });

  // --- STATE OPSI DROPDOWN (Master Data) ---
  const [options, setOptions] = useState({
    equipment: [] as Option[],
    users: [] as Option[], // Untuk GL & Manpower
    failure: [] as Option[],
    diagnosis: [] as Option[],
    reason: [] as Option[],
    finding: [] as Option[],
    area: [] as Option[],
    action: [] as Option[],
    instruction: [] as Option[],
    sub_component: [] as Option[],
    problems: [] as Option[],
    activities: [] as Option[],
    activity_type: [] as Option[],
    shift: [
        { label: "Shift 1", value: "Shift 1" },
        { label: "Shift 2", value: "Shift 2" },
        { label: "Shift 3", value: "Shift 3" }
    ] as Option[],
    status_breakdown: [
        { label: "Schedule", value: "Schedule" },
        { label: "Unschedule", value: "Unschedule" }
    ] as Option[],
    activity_status: [
        { label: "RFU", value: "RFU" },
        { label: "Waiting Part", value: "Waiting Part" },
        { label: "Continue", value: "Continue" }
    ] as Option[],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Fetch Master Data untuk Dropdown
  useEffect(() => {
    const fetchMasterData = async () => {
      // Helper untuk fetch tabel sederhana
      const getOpts = async (table: string, labelField = 'name') => {
        const { data } = await supabase.from(table).select(`id, ${labelField}`);
        return data?.map((i: any) => ({ label: i[labelField], value: i.id })) || [];
      };

      const [eq, fail, diag, rea, find, ar, act, inst, sub, prob, activ, actType, usrs] = await Promise.all([
        getOpts('equipment', 'unit_code'), // Ganti 'unit_code' atau 'name' sesuai kolom DB
        getOpts('failure', 'name'), // Sesuaikan nama kolom label (misal: 'code' atau 'description')
        getOpts('diagnosis', 'name'),
        getOpts('reason', 'name'),
        getOpts('finding', 'name'),
        getOpts('area', 'name'),
        getOpts('action', 'name'),
        getOpts('instruction', 'name'),
        getOpts('sub_component', 'name'),
        getOpts('problems', 'name'),
        getOpts('activities', 'name'),
        getOpts('activity_type', 'name'),
        supabase.from('users').select('id, full_name, nrp') // Fetch Users khusus
      ]);

      // Format User Options (Gabung Nama + NRP)
      const userOpts = usrs.data?.map((u: any) => ({ 
        label: `${u.full_name || ''} ${u.nrp ? `(${u.nrp})` : ''}`, 
        value: u.id 
      })) || [];

      setOptions(prev => ({
        ...prev,
        equipment: eq,
        failure: fail,
        diagnosis: diag,
        reason: rea,
        finding: find,
        area: ar,
        action: act,
        instruction: inst,
        sub_component: sub,
        problems: prob,
        activities: activ,
        activity_type: actType,
        users: userOpts
      }));
    };
    
    fetchMasterData();
  }, []);

  // 2. Load Data Report Existing
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
             ...data, // Auto fill semua field yang namanya sama
             // Handle field angka/khusus jika perlu
             hour_meter: data.hour_meter?.toString() || "",
          });
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- LOGIC SIMPAN & VALIDASI ---
  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      // Hapus field system yang tidak boleh diupdate manual user
      const { status, approved_by, ...payload } = formData; 
      
      const { error } = await supabase
        .from('repair_reports')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      navigate(-1);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndValidate = async () => {
    if (!id || !user) return;
    if (!window.confirm("Apakah data sudah benar? Laporan akan disetujui.")) return;
    
    setSaving(true);
    try {
      const { status, approved_by, ...payload } = formData; 
      
      const { error } = await supabase
        .from('repair_reports')
        .update({
            ...payload,
            status: 'approved',
            approved_by: user.id,
            approved_by_id: user.id,
            approved_name: user.user_metadata?.full_name || user.email
        })
        .eq('id', id);

      if (error) throw error;
      navigate("/validasi");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Report Details...</div>;

  const needsValidation = !formData.approved_by;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded-xl mt-6">
      {/* HEADER & NAV */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Edit Laporan Breakdown</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm">
             ← Kembali
        </button>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-3 mb-6 rounded border border-red-200">{error}</div>}

      <form onSubmit={handleSaveOnly} className="space-y-6">
        
        {/* ROW 1: WO & Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="WO Number" value={formData.wo_number} onChange={(e) => handleChange("wo_number", e.target.value)} />
            <SelectField label="Equipment" value={formData.equipment_id} options={options.equipment} onChange={(val) => handleChange("equipment_id", val)} />
        </div>

        {/* ROW 2: Problem Description (Full Width) */}
        <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
             <textarea className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" rows={2} 
                value={formData.problem_description} onChange={(e) => handleChange("problem_description", e.target.value)} />
        </div>

        {/* ROW 3: Part & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-1">
                <InputField label="Part Causing Failure" value={formData.part_causing_failure} onChange={(e) => handleChange("part_causing_failure", e.target.value)} />
             </div>
             <InputField type="date" label="Start Date" value={formData.start_date} onChange={(e) => handleChange("start_date", e.target.value)} />
             <InputField type="time" label="Start Hour" value={formData.start_hour} onChange={(e) => handleChange("start_hour", e.target.value)} />
        </div>

        {/* ROW 4: Finish Dates & Hour Meter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-1">
                {/* Empty spacer or duration display */}
                <InputField type="number" label="Duration (Hours)" value={formData.duration} onChange={(e) => handleChange("duration", e.target.value)} disabled />
             </div>
             <InputField type="date" label="Finish Date" value={formData.finish_date} onChange={(e) => handleChange("finish_date", e.target.value)} />
             <InputField type="time" label="Finish Hour" value={formData.finish_hour} onChange={(e) => handleChange("finish_hour", e.target.value)} />
        </div>

        {/* ROW 5: HM, Shift, GL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <InputField type="number" label="Hour Meter" value={formData.hour_meter} onChange={(e) => handleChange("hour_meter", e.target.value)} />
             <SelectField label="Shift" value={formData.shift} options={options.shift} onChange={(val) => handleChange("shift", val)} />
             <SelectField label="Group Leader" value={formData.group_leader_id} options={options.users} onChange={(val) => handleChange("group_leader_id", val)} />
        </div>

        {/* ROW 6: Manpower (Full Width or Special Component) */}
        <div>
             {/* Note: Jika SelectField kamu belum support multi, ini mungkin akan error atau cuma pilih 1. 
                 Idealnya pakai component ReactSelect isMulti */}
             <label className="block text-sm font-medium text-gray-700 mb-1">Manpower</label>
             <SelectField label="" placeholder="Pilih Manpower..." value={formData.manpower_ids} options={options.users} onChange={(val) => handleChange("manpower_ids", val)} />
        </div>

        {/* --- DETAIL TEKNIS (2 KOLOM) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
             <SelectField label="Failure" value={formData.failure_id} options={options.failure} onChange={(val) => handleChange("failure_id", val)} />
             <SelectField label="Diagnosis" value={formData.diagnosis_id} options={options.diagnosis} onChange={(val) => handleChange("diagnosis_id", val)} />
             
             <SelectField label="Reason" value={formData.reason_id} options={options.reason} onChange={(val) => handleChange("reason_id", val)} />
             <SelectField label="Finding" value={formData.finding_id} options={options.finding} onChange={(val) => handleChange("finding_id", val)} />

             <SelectField label="Area" value={formData.area_id} options={options.area} onChange={(val) => handleChange("area_id", val)} />
             <SelectField label="Action" value={formData.action_id} options={options.action} onChange={(val) => handleChange("action_id", val)} />
             
             <SelectField label="Instruction" value={formData.instruction_id} options={options.instruction} onChange={(val) => handleChange("instruction_id", val)} />
             <SelectField label="Sub Component" value={formData.sub_component_id} options={options.sub_component} onChange={(val) => handleChange("sub_component_id", val)} />

             <SelectField label="Problem" value={formData.problems_id} options={options.problems} onChange={(val) => handleChange("problems_id", val)} />
             <SelectField label="Activity" value={formData.activity_id} options={options.activities} onChange={(val) => handleChange("activity_id", val)} />

             <SelectField label="Activity Type" value={formData.activity_type_id} options={options.activity_type} onChange={(val) => handleChange("activity_type_id", val)} />
             {/* Spacer kosong biar rapi */}
             <div className="hidden md:block"></div>
        </div>

        {/* COMMENT SECTION */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Komentar Mekanik / Keterangan Tambahan</label>
            <textarea className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" rows={3} 
                value={formData.mechanic_comment} onChange={(e) => handleChange("mechanic_comment", e.target.value)} />
        </div>

        {/* FOOTER STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField label="Status Breakdown" value={formData.status_breakdown} options={options.status_breakdown} onChange={(val) => handleChange("status_breakdown", val)} />
            <SelectField label="Activity Status" value={formData.activity_status} options={options.activity_status} onChange={(val) => handleChange("activity_status", val)} />
        </div>

        {/* --- AREA TOMBOL ACTION --- */}
        <div className="flex gap-4 pt-8 border-t mt-8 sticky bottom-0 bg-white pb-4 z-10">
            <button 
                type="submit" 
                onClick={handleSaveOnly}
                disabled={saving}
                className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
            >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>

            {needsValidation && (
                <button
                    type="button" 
                    onClick={handleSaveAndValidate}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                    {saving ? 'Memproses...' : (
                        <>
                           <span>Simpan & Setujui</span>
                           <span className="text-xs bg-green-800 px-2 py-0.5 rounded text-green-100 uppercase font-bold tracking-wider">Validate</span>
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