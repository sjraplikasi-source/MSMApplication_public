// =============================
// src/pages/Backlog/SupplyDetail.tsx
// =============================

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { pushNotif } from "../../utils/notif";

type UUID = string;

type SpareRow = {
  id?: UUID;
  backlog_id?: UUID;
  part_number: string;
  part_name: string;
  qty: number;
  no_wr_pr?: string | null;
  no_po?: string | null;
  remarks?: string | null;
  stock_status?: string | null;
  estimated_ready_date?: string | null;
  created_at?: string;
  image_url?: string | null;
};

type Backlog = {
  id: UUID;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string;
  status: string;
  need_sparepart: boolean;
  need_shutdown: boolean; // <-- Tambahkan properti ini
};

const STATUS_OPTIONS = ["Ready", "Order", "Indent", "Not Ready"];

const isReady = (v?: string | null) => (v ?? "").toLowerCase() === "ready";

export default function SupplyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [spares, setSpares] = useState<SpareRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Ambil juga need_shutdown dari backlog
        const { data: b, error: eb } = await supabase
          .from("backlogs")
          .select("id, registration_code, unit_code, problem, date, status, need_sparepart, need_shutdown") // <-- Ambil juga need_shutdown
          .eq("id", id)
          .single();
        if (eb) throw eb;

        const { data: s, error: es } = await supabase
          .from("backlog_spareparts")
          .select("*")
          .eq("backlog_id", id)
          .order("created_at", { ascending: true });
        if (es) throw es;

        if (mounted) {
          setBacklog(b as Backlog);
          setSpares((s ?? []).map((row) => ({ ...row })));
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const title = useMemo(() => `Supply — Detail Backlog (${backlog?.registration_code ?? ""})`, [backlog]);

  const handleSpareChange = (idx: number, patch: Partial<SpareRow>) => {
    setSpares(prev => {
        const next = [...prev];
        const merged = {...next[idx], ...patch};
        if(patch.stock_status !== undefined && isReady(patch.stock_status)) {
            merged.estimated_ready_date = null;
        }
        next[idx] = merged;
        return next;
    });
  };

  const saveAll = async () => {
    try {
      setSaving(true);
      setError(null);

      for (const row of spares) {
        const { id: sparepartId, backlog_id, created_at, ...updatePayload } = row;
        if (isReady(updatePayload.stock_status)) {
          updatePayload.estimated_ready_date = null;
        }
        if (row.id) {
          const { error: uerr } = await supabase.from("backlog_spareparts").update(updatePayload).eq("id", row.id);
          if (uerr) throw uerr;
        } else {
          const { error: ierr } = await supabase.from("backlog_spareparts").insert([{ ...updatePayload, backlog_id: id }]);
          if (ierr) throw ierr;
        }
      }

      const { error: updateTimestampError } = await supabase
        .from("backlogs")
        .update({ 
            supply_updated_at: new Date().toISOString(),
            supply_updated_by: user?.id || null
        })
        .eq("id", id);
      if (updateTimestampError) throw updateTimestampError;

      // --- LOGIKA BARU YANG DIPERBAIKI ---
      const isPartReady = !backlog?.need_sparepart || (spares.length > 0 && spares.every(p => isReady(p.stock_status)));
      const needsShutdown = backlog?.need_shutdown === true;
      let nextStatus = backlog?.status;
      let notificationBody = "";

      if (isPartReady) {
        if (needsShutdown) {
          nextStatus = 'menunggu_shutdown';
          notificationBody = `Semua part untuk backlog ${backlog.registration_code} sudah ready. Backlog ini membutuhkan shutdown.`;
        } else {
          nextStatus = 'siap_dijadwalkan';
          notificationBody = `Semua part untuk backlog ${backlog.registration_code} sudah ready dan tidak butuh shutdown. Siap dijadwalkan.`;
        }
      }
      
      if (nextStatus && nextStatus !== backlog?.status) {
        const { error: updateStatusError } = await supabase
          .from("backlogs")
          .update({ status: nextStatus })
          .eq("id", id);
        if (updateStatusError) throw updateStatusError;

        await pushNotif({
          backlog_id: id,
          title: "Status Kesiapan Backlog Berubah",
          body: notificationBody,
          target_role: "supervisor",
        });
      }
      
      //alert("Data berhasil disimpan!");
      navigate(-1);

    } catch (e: any) {
      console.error("Gagal menyimpan data:", e);
      setError(e?.message ?? String(e));
      alert("Gagal menyimpan: " + (e?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!backlog) return <div className="p-4">Data backlog tidak ditemukan.</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Kembali</Button>
          <Button disabled={saving} onClick={saveAll}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><span className="text-slate-500">Unit:</span> <b>{backlog.unit_code}</b></div>
          <div><span className="text-slate-500">Tanggal:</span> <b>{backlog.date}</b></div>
          <div className="md:col-span-2">
            <span className="text-slate-500">Problem:</span> <b>{backlog.problem}</b>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border">
        <div className="px-4 py-3 font-semibold border-b">Spareparts</div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-2 [&>th]:py-2 text-left">
                <th>No</th>
                <th>Part Number</th>
                <th>Part Name</th>
                <th>Qty</th>
                <th>No WR/PR</th>
                <th>No PO</th>
                <th>Remarks</th>
                <th>Stock Status</th>
                <th>Est. Ready</th>
                <th>Gambar</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-1">
              {spares.map((s, i) => {
                const ready = isReady(s.stock_status);
                return (
                  <tr key={s.id ?? `new-${i}`} className="border-t">
                    <td>{i + 1}</td>
                    <td className="min-w-[140px]"><input className="input input-sm w-full border rounded px-2 py-1" value={s.part_number ?? ""} onChange={(e) => handleSpareChange(i, { part_number: e.target.value })}/></td>
                    <td className="min-w-[180px]"><input className="input input-sm w-full border rounded px-2 py-1" value={s.part_name ?? ""} onChange={(e) => handleSpareChange(i, { part_name: e.target.value })}/></td>
                    <td className="min-w-[80px]"><input type="number" className="input input-sm w-24 border rounded px-2 py-1" value={s.qty ?? 0} onChange={(e) => handleSpareChange(i, { qty: Number(e.target.value || 0) })}/></td>
                    <td className="min-w-[140px]"><input className="input input-sm w-full border rounded px-2 py-1" value={s.no_wr_pr ?? ""} onChange={(e) => handleSpareChange(i, { no_wr_pr: e.target.value })}/></td>
                    <td className="min-w-[140px]"><input className="input input-sm w-full border rounded px-2 py-1" value={s.no_po ?? ""} onChange={(e) => handleSpareChange(i, { no_po: e.target.value })}/></td>
                    <td className="min-w-[160px]"><input className="input input-sm w-full border rounded px-2 py-1" value={s.remarks ?? ""} onChange={(e) => handleSpareChange(i, { remarks: e.target.value })}/></td>
                    <td className="min-w-[140px]">
                      <select className="input input-sm w-full border rounded px-2 py-1" value={s.stock_status ?? ""} onChange={(e) => handleSpareChange(i, { stock_status: e.target.value })}>
                        <option value="">— pilih —</option>
                        {STATUS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                      </select>
                    </td>
                    <td className="min-w-[160px]"><input type="date" className={`input input-sm w-full border rounded px-2 py-1 ${ready ? "bg-slate-100 cursor-not-allowed" : ""}`} value={s.estimated_ready_date ?? ""} onChange={(e) => handleSpareChange(i, { estimated_ready_date: e.target.value || null })} disabled={ready} placeholder="yyyy-mm-dd"/></td>

                    <td className="min-w-[80px]">
  {s.image_url ? (
    <a href={s.image_url} target="_blank" rel="noopener noreferrer">
      <img 
        src={s.image_url} 
        alt="Part" 
        className="h-12 w-12 object-cover rounded border hover:opacity-80 cursor-pointer" 
      />
    </a>
  ) : (
    <span className="text-slate-400">-</span>
  )}
</td>
                  </tr>
                );
              })}
              {spares.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6 text-slate-500">Backlog ini tidak membutuhkan sparepart.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
