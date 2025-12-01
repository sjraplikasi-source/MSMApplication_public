// =============================
// src/pages/Backlog/BacklogValidation.tsx
// =============================

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { pushNotif } from "@/utils/notif";

type Backlog = {
  id: string;
  registration_code: string | null;
  unit_code: string;
  date: string;
  problem: string;
  status: string;
};

const STATUS = {
  DRAFT: "draft",
  VALIDATED: "validated",
  REVIEWED: "reviewed",
  REJECTED: "rejected",
} as const;

const BacklogValidation: React.FC = () => {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchBacklogs = async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const { data, error } = await supabase
        .from("backlogs")
        .select("id, registration_code, unit_code, date, problem, status")
        .eq("status", STATUS.DRAFT)
        .order("date", { ascending: false });

      if (error) throw error;
      setBacklogs((data as Backlog[]) ?? []);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Gagal memuat data.");
      setBacklogs([]);
    } finally {
      setLoading(false);
    }
  };

  const approveBacklog = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Gagal mengambil user login."); return; }

    const { error } = await supabase
      .from("backlogs")
      .update({
        status: STATUS.VALIDATED,
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Gagal memvalidasi:", error.message);
      alert("Terjadi kesalahan saat memvalidasi backlog.");
    } else {
      fetchBacklogs();
    }
    const { data: b } = await supabase.from("backlogs")
  .select("registration_code")
  .eq("id", id).single();

await pushNotif({
  backlog_id: id,
  title: "Backlog tervalidasi",
  body: `Backlog ${b?.registration_code ?? ""} telah divalidasi.`,
  target_role: "planner", // siapa yang harus tahu
});
  };

  const rejectBacklog = async (id: string) => {
    const { error } = await supabase.from("backlogs").update({ status: STATUS.REJECTED }).eq("id", id);
    if (error) {
      console.error("Gagal menolak backlog:", error.message);
      alert("Terjadi kesalahan saat menolak backlog.");
    } else {
      fetchBacklogs();
    }
  };

  useEffect(() => { fetchBacklogs(); }, []);
  
// ❗ Jangan letakkan sebelum hooks lain.
// Guard tepat sebelum render:
if (user?.role === "mechanic") {
  return (
    <p className="p-4 text-red-600">
      Akses ditolak. Halaman ini tidak tersedia untuk mekanik.
    </p>
  );
}

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Validasi Backlog</h2>

      {loading && <p className="text-gray-500">Memuat data...</p>}
      {!loading && errMsg && <p className="text-red-600">Error: {errMsg}</p>}
      {!loading && !errMsg && backlogs.length === 0 && (
        <p className="text-gray-500">Tidak ada backlog yang perlu divalidasi.</p>
      )}

      {!loading && !errMsg && backlogs.length > 0 && (
        <div className="space-y-4">
          {backlogs.map((item) => (
            <div key={item.id} className="border p-4 rounded shadow-sm bg-white flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {item.registration_code ?? "-"} - <b>{item.unit_code}</b>
                </h3>
                <p className="text-sm text-gray-600">{item.problem}</p>
                <p className="text-sm text-gray-400">
                  {item.date ? format(new Date(item.date), "dd MMM yyyy") : "-"}
                </p>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                <Button onClick={() => navigate(`/backlog/edit/${item.id}`)} variant="outline">Edit</Button>
                <Button onClick={() => approveBacklog(item.id)} className="bg-green-600 hover:bg-green-700">Setujui</Button>
                <Button onClick={() => rejectBacklog(item.id)} className="bg-red-600 hover:bg-red-700">Tolak</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BacklogValidation;
