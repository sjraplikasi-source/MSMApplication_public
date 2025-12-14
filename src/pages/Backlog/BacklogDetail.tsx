// =============================
// src/pages/Backlog/BacklogDetail.tsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Select from "react-select";
import { pushNotif } from "@/utils/notif";

type UUID = string;

type Backlog = {
  id: UUID;
  registration_code: string | null;
  unit_code: string;
  date: string; // yyyy-mm-dd
  problem: string;
  status: "draft" | "validated" | "reviewed" | "closed" | "rejected" | string;
  need_sparepart: boolean;
  need_tools: boolean;
  need_manpower: boolean;
  need_shutdown: boolean;
  shutdown_required: boolean | null;
  priority?: string | null;
  // Field untuk SM
  supply_updated_at?: string | null;
  supply_updated_by?: string | null;
};

type Spare = {
  id: UUID;
  part_number: string;
  part_name: string;
  qty: number;
  stock_status: string | null;
  estimated_ready_date: string | null;
  remarks: string | null;
  no_wr_pr: string | null;
  no_po: string | null;
  image_url?: string | null; 
};

type Tool = {
  id: UUID;
  tool_name: string;
  specification: string | null;
  qty: number;
  remarks: string | null;
};

type Man = {
  id: UUID;
  skill_required: string;
  qty: number;
  remarks: string | null;
};

// dropdown mechanic
type ManpowerOption = { value: string; label: string };

const canCloseByRole = (role?: string | null) =>
  !!role &&
  ["group_leader", "supervisor", "planner", "admin"].includes(role);

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = "bg-gray-100 text-gray-700",
}) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
    {children}
  </span>
);

const BacklogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [b, setB] = useState<Backlog | null>(null);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [mans, setMans] = useState<Man[]>([]);

  // closing states
  const [closedDate, setClosedDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [mechanicOptions, setMechanicOptions] = useState<ManpowerOption[]>([]);
  const [mechanics, setMechanics] = useState<ManpowerOption[]>([]); 

  // --- LOGIKA UNTUK MENENTUKAN APAKAH TOMBOL EDIT MUNCUL ---
  const canEdit = useMemo(() => {
    if (!user || !b) return false;
    const role = user.role?.toLowerCase() || '';
    const status = b.status;

    if (role === 'admin') return true; 
    if (status === 'closed' || status === 'rejected') return false; 

    if ((status === 'draft' || status === 'validated') && role === 'planner') {
      return true;
    }
    if (['reviewed', 'siap_dijadwalkan', 'menunggu_shutdown', 'dijadwalkan'].includes(status) && ['supervisor', 'group_leader'].includes(role)) {
      return true;
    }
    
    return false;
  }, [user, b]);
  
  // load all
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      setErr(null);
      try {
        // backlog
        const { data: bRes, error: bErr } = await supabase
          .from("backlogs")
          .select("*")
          .eq("id", id)
          .single<Backlog>();
        if (bErr) throw bErr;

        // detail children
        const [{ data: sp }, { data: tl }, { data: mp }] = await Promise.all([
          supabase
            .from("backlog_spareparts")
            .select("*")
            .eq("backlog_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("backlog_tools")
            .select("*")
            .eq("backlog_id", id)
            .order("created_at", { ascending: true }),
          supabase
            .from("backlog_manpower")
            .select("*")
            .eq("backlog_id", id)
            .order("created_at", { ascending: true }),
        ]);

        // manpower list for dropdown
        const { data: mm, error: mmErr } = await supabase
          .from("manpower")
          .select("id, name, nrp")
          .order("name", { ascending: true });
        if (mmErr) throw mmErr;

        if (!cancelled) {
          setB(bRes as Backlog);
          setSpares((sp as any[]) as Spare[]);
          setTools((tl as any[]) as Tool[]);
          setMans((mp as any[]) as Man[]);

          const opts =
            (mm || []).map((row: any) => ({
              value: row.id as string,
              label: row.nrp ? `${row.name} / ${row.nrp}` : row.name,
            })) ?? [];
          setMechanicOptions(opts);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Gagal memuat data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const badgeColor = useMemo(() => {
    switch (b?.status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "validated":
        return "bg-blue-100 text-blue-700";
      case "reviewed":
        return "bg-purple-100 text-purple-700";
      case "closed":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }, [b?.status]);

  // --- FEATURE: RESET SUPPLY MANAGEMENT ---
  // Bisa diakses siapa saja, tidak ada cek role
  const handleResetSM = async () => {
    if (!b || !id) return;
    
    const confirmMsg = "Yakin ingin mereset status Supply Management?\n\nData estimasi & status update dari SM akan dihapus (kembali ke 'Perlu Update').";
    if (!window.confirm(confirmMsg)) return;

    try {
        setSaving(true);
        console.log("Resetting SM status for ID:", id);

        // Update ke NULL
        const { error } = await supabase
            .from('backlogs')
            .update({ 
                supply_updated_at: null, 
                supply_updated_by: null 
            })
            .eq('id', id);

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        // Update state lokal agar UI langsung berubah
        setB(prev => {
            if (!prev) return null;
            return { 
                ...prev, 
                supply_updated_at: null, 
                supply_updated_by: null 
            };
        });

        alert("Berhasil! Status Supply Management telah di-reset.");

    } catch (e: any) {
        console.error(e);
        alert("Gagal reset status: " + (e?.message || "Terjadi kesalahan sistem"));
    } finally {
        setSaving(false);
    }
  };
  // ---------------------------------------------------

  const handleCloseBacklog = async () => {
    if (!b || !id) return;
    if (mechanics.length === 0) {
      alert("Silakan pilih minimal satu Nama Mekanik.");
      return;
    }
    try {
      setSaving(true);
      const mechanicNames = mechanics.map((o) => o.label).join(", ");
      const currentUserId = user?.id ?? null;
      
      const { error: cErr } = await supabase.from("backlog_closings").insert({
        backlog_id: id,
        closed_by: currentUserId,
        closed_date: closedDate || null,
        mechanic_name: mechanicNames, 
      });
      if (cErr) throw cErr;

      const { error: uErr } = await supabase
        .from("backlogs")
        .update({ status: "closed" })
        .eq("id", id);
      if (uErr) throw uErr;

      await pushNotif({
        backlog_id: id,
        title: "Backlog ditutup",
        body: `Backlog ${b.registration_code ?? ""} telah ditutup.`,
        target_role: "planner",
      });
      
      window.location.href = '/Backlog/list'; 
    } catch (e: any) {
      console.error(e);
      alert("Gagal menutup backlog: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!b) return <div className="p-4">Data tidak ditemukan.</div>;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Detail Backlog</h2>
          <div className="text-sm text-gray-600 space-y-0.5">
            <div>
              <span className="font-medium">Kode:</span>{" "}
              {b.registration_code ?? "-"}
            </div>
            <div>
              <span className="font-medium">Tanggal:</span>{" "}
              {b.date ? new Date(b.date).toLocaleDateString() : "-"}
            </div>
            <div>
              <span className="font-medium">Unit:</span> {b.unit_code}
            </div>
          </div>
          <div className="mt-2 flex gap-2 items-center">
            <Badge color={badgeColor}>{b.status}</Badge>
            {/* Indikator visual status SM */}
            {b.supply_updated_at ? (
                <Badge color="bg-orange-100 text-orange-700">SM Updated</Badge>
            ) : (
                <Badge color="bg-gray-100 text-gray-500">SM Waiting</Badge>
            )}
          </div>
          <div className="mt-2">
            <span className="text-xs font-semibold mr-2">PRIORITY:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
            b.priority === 'High' ? 'bg-red-600' :
            b.priority === 'Medium' ? 'bg-yellow-500' :
            b.priority === 'Low' ? 'bg-blue-500' : 'bg-gray-500'
            }`}>
            {b.priority || 'Low'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
            Kembali
            </Button>
        </div>
      </div>

      {/* --- TOMBOL ACTION --- */}
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button onClick={() => navigate(`/backlog/edit/${id}`)}>
            Edit Backlog
          </Button>
        )}

        {/* --- TOMBOL RESET SM --- */}
        {/* Muncul jika data supply_updated_at ADA ISINYA (tidak null) */}
        {b.supply_updated_at && (
            <Button 
                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                onClick={handleResetSM}
                disabled={saving}
            >
                {saving ? "Memproses..." : "Reset Status SM"}
            </Button>
        )}
        
        <Button variant="outline" onClick={() => navigate(-1)}>
          Kembali
        </Button>
      </div>
      
      <div className="border rounded-lg bg-white">
        <div className="px-4 py-2 border-b font-semibold">Problem</div>
        <div className="p-4 whitespace-pre-wrap">{b.problem}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spareparts */}
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="font-semibold">Spareparts</span>
            {b.need_sparepart && (
              <Badge color="bg-emerald-50 text-emerald-700">Dibutuhkan</Badge>
            )}
          </div>
          <div className="p-4 overflow-auto">
            {spares.length === 0 ? (
              <div className="text-sm text-gray-500">Tidak ada data.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Part Number</th>
                    <th className="text-left p-2">Part Name</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Stock</th>
                    <th className="text-left p-2">Est. Ready</th>
                    <th className="text-left p-2">WR/PR</th>
                    <th className="text-left p-2">PO</th>
                    <th className="text-left p-2">Gambar</th>
                  </tr>
                </thead>
                <tbody>
                  {spares.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{s.part_number}</td>
                      <td className="p-2">{s.part_name}</td>
                      <td className="p-2">{s.qty}</td>
                      <td className="p-2">{s.stock_status ?? "-"}</td>
                      <td className="p-2">
                        {s.estimated_ready_date
                          ? new Date(s.estimated_ready_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-2">{s.no_wr_pr ?? "-"}</td>
                      <td className="p-2">{s.no_po ?? "-"}</td>
                      <td className="p-2">
                      {s.image_url ? (
                        <a href={s.image_url} target="_blank" rel="noopener noreferrer">
                          <img src={s.image_url} alt="Part" className="h-12 w-12 object-cover rounded border hover:opacity-80" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tools */}
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="font-semibold">Special Tools</span>
            {b.need_tools && (
              <Badge color="bg-emerald-50 text-emerald-700">Dibutuhkan</Badge>
            )}
          </div>
          <div className="p-4 overflow-auto">
            {tools.length === 0 ? (
              <div className="text-sm text-gray-500">Tidak ada data.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Nama</th>
                    <th className="text-left p-2">Spesifikasi</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-2">{t.tool_name}</td>
                      <td className="p-2">{t.specification ?? "-"}</td>
                      <td className="p-2">{t.qty}</td>
                      <td className="p-2">{t.remarks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Manpower */}
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="font-semibold">Additional Manpower</span>
            {b.need_manpower && (
              <Badge color="bg-emerald-50 text-emerald-700">Dibutuhkan</Badge>
            )}
          </div>
          <div className="p-4 overflow-auto">
            {mans.length === 0 ? (
              <div className="text-sm text-gray-500">Tidak ada data.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Skill/Nama</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {mans.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.skill_required}</td>
                      <td className="p-2">{m.qty}</td>
                      <td className="p-2">{m.remarks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Shutdown */}
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-2 border-b font-semibold">Shutdown</div>
          <div className="p-4">
            <div className="text-sm">
              Butuh Shutdown: <b>{b.need_shutdown ? "Ya" : "Tidak"}</b>{" "}
              — Shutdown Required?{" "}
              <b>
                {b.need_shutdown
                  ? b.shutdown_required
                    ? "Ya"
                    : "Tidak"
                  : "-"}
              </b>
            </div>
          </div>
        </div>
      </div>

      {/* Closing */}
      {b.status !== "closed" && canCloseByRole(user?.role) && (
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-2 border-b font-semibold">Closing</div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">
                  Tanggal Close
                </label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={closedDate}
                  onChange={(e) => setClosedDate(e.target.value)}
                />
              </div>

              <div className="md:col-span-9">
                <label className="block text-sm font-medium mb-1">
                  Nama Mekanik (bisa lebih dari 1)
                </label>
                <Select
                  options={mechanicOptions}
                  value={mechanics}
                  onChange={(opts) => setMechanics((opts as ManpowerOption[]) || [])}
                  placeholder="Cari / pilih mekanik…"
                  isSearchable
                  isMulti
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Batal
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCloseBacklog}
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan & Close"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklogDetail;