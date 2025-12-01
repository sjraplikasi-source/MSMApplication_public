// =============================
// src/pages/Backlog/PlannerReviewDetail.tsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { pushNotif } from "@/utils/notif";

type UUID = string;

type Backlog = {
  id: UUID;
  unit_code: string;
  problem: string;
  need_sparepart: boolean;
  need_tools: boolean;
  need_manpower: boolean;
  need_shutdown: boolean;
  shutdown_required: boolean | null;
  date: string;
  registration_code: string | null;
  status: string;
};

type Spare = {
  id?: UUID;
  backlog_id?: UUID;
  part_number: string;
  part_name: string;
  qty: number;
  stock_status: string | null;
  estimated_ready_date: string | null; // yyyy-mm-dd
  remarks: string | null;
  no_wr_pr: string | null;
  no_po: string | null;
  image_url?: string | null;
};
type Tool = {
  id?: UUID;
  backlog_id?: UUID;
  tool_name: string;
  specification: string | null;
  qty: number;
  remarks: string | null;
};
type Manpower = {
  id?: UUID;
  backlog_id?: UUID;
  skill_required: string;
  qty: number;
  remarks: string | null;
};

// ==== OPTIONS ====
const STOCK_STATUS_OPTIONS = [
  { value: "READY", label: "Ready" },
  { value: "ORDER", label: "Indent/Order" },
  { value: "NOSTOCK", label: "Tidak Ada Stok" },
] as const;

// ==== Error maps (ringan) ====
type SpareErr = { part_number?: string; part_name?: string; qty?: string; stock_status?: string; estimated_ready_date?: string };
type ToolErr = { tool_name?: string; qty?: string };
type ManErr = { skill_required?: string; qty?: string };

// ==== UI helpers (di luar komponen agar fokus input tidak hilang) ====
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null;

const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-base font-semibold">{title}</h3>
    {right}
  </div>
);

const SectionCard: React.FC<{ title?: string; onRemove?: () => void; children: React.ReactNode }> = ({
  title,
  onRemove,
  children,
}) => (
  <div className="border rounded-lg">
    <div className="flex items-center justify-between px-4 py-2">
      <h4 className="text-sm font-semibold">{title ?? ""}</h4>
      {onRemove && (
        <button type="button" className="text-red-600 hover:underline" onClick={onRemove}>
          Hapus
        </button>
      )}
    </div>
    <div className="px-4 pb-4">{children}</div>
  </div>
);

const BacklogReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [backlog, setBacklog] = useState<Backlog | null>(null);

  // dynamic rows
  const [spares, setSpares] = useState<Spare[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [manpower, setManpower] = useState<Manpower[]>([]);

  // ids awal untuk diff delete
  const [initSpareIds, setInitSpareIds] = useState<UUID[]>([]);
  const [initToolIds, setInitToolIds] = useState<UUID[]>([]);
  const [initManIds, setInitManIds] = useState<UUID[]>([]);

  // error maps
  const [spErr, setSpErr] = useState<Record<number, SpareErr>>({});
  const [tlErr, setTlErr] = useState<Record<number, ToolErr>>({});
  const [mpErr, setMpErr] = useState<Record<number, ManErr>>({});

  const canSave = useMemo(() => !!backlog && !saving, [backlog, saving]);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // backlog
        const { data: b, error: e1 } = await supabase
          .from("backlogs")
          .select("*")
          .eq("id", id)
          .single<Backlog>();
        if (e1) throw e1;
        setBacklog(b);

        // spareparts
        const { data: sp, error: e2 } = await supabase
          .from("backlog_spareparts")
          .select("*")
          .eq("backlog_id", id)
          .order("created_at", { ascending: true });
        if (e2) throw e2;
        const spMapped =
          (sp as any[] | null)?.map((x) => ({
            id: x.id,
            backlog_id: x.backlog_id,
            part_number: x.part_number ?? "",
            part_name: x.part_name ?? "",
            qty: Number(x.qty ?? 0),
            stock_status: x.stock_status ?? "",
            estimated_ready_date: x.estimated_ready_date ? String(x.estimated_ready_date).slice(0, 10) : "",
            remarks: x.remarks ?? "",
            no_wr_pr: x.no_wr_pr ?? "",
            no_po: x.no_po ?? "",
            image_url: x.image_url ?? null,
          })) ?? [];
        setSpares(spMapped);
        setInitSpareIds(spMapped.map((x) => x.id!).filter(Boolean) as UUID[]);

        // tools
        const { data: tl, error: e3 } = await supabase
          .from("backlog_tools")
          .select("*")
          .eq("backlog_id", id)
          .order("created_at", { ascending: true });
        if (e3) throw e3;
        const tlMapped =
          (tl as any[] | null)?.map((x) => ({
            id: x.id,
            backlog_id: x.backlog_id,
            tool_name: x.tool_name ?? "",
            specification: x.specification ?? "",
            qty: Number(x.qty ?? 0),
            remarks: x.remarks ?? "",
          })) ?? [];
        setTools(tlMapped);
        setInitToolIds(tlMapped.map((x) => x.id!).filter(Boolean) as UUID[]);

        // manpower
        const { data: mp, error: e4 } = await supabase
          .from("backlog_manpower")
          .select("*")
          .eq("backlog_id", id)
          .order("created_at", { ascending: true });
        if (e4) throw e4;
        const mpMapped =
          (mp as any[] | null)?.map((x) => ({
            id: x.id,
            backlog_id: x.backlog_id,
            skill_required: x.skill_required ?? "",
            qty: Number(x.qty ?? 0),
            remarks: x.remarks ?? "",
          })) ?? [];
        setManpower(mpMapped);
        setInitManIds(mpMapped.map((x) => x.id!).filter(Boolean) as UUID[]);
      } catch (e: any) {
        setError(e?.message ?? "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // helpers input
  const updateRow = <T extends object>(
    arr: T[],
    setArr: (a: T[]) => void,
    idx: number,
    key: keyof T,
    value: any
  ) => {
    const copy = [...arr];
    // @ts-ignore
    copy[idx][key] = value;
    setArr(copy);
  };

  const addRow = <T extends object>(factory: () => T, setArr: (a: T[]) => void) =>
    setArr((prev) => [...prev, factory()]);

  const removeRow = <T extends { id?: string }>(
    arr: T[],
    setArr: (a: T[]) => void,
    idx: number,
    initIds: UUID[],
    setInitIds: (ids: UUID[]) => void
  ) => {
    const item = arr[idx];
    const copy = [...arr];
    copy.splice(idx, 1);
    setArr(copy);
    // kalau baris existing dihapus → keluarkan dari initIds (agar tak dihapus dua kali)
    if (item?.id) setInitIds(initIds.filter((x) => x !== item.id));
  };

  // Validasi ringan
  const validateSpare = (s: Spare): SpareErr => {
    const e: SpareErr = {};
    if (!s.part_number?.trim()) e.part_number = "Part number wajib diisi.";
    if (!s.part_name?.trim()) e.part_name = "Part name wajib diisi.";
    if (s.qty == null || Number(s.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    if (!s.stock_status) e.stock_status = "Pilih stock status.";
    if ((s.stock_status === "ORDER" || s.stock_status === "NOSTOCK") && !s.estimated_ready_date) {
      e.estimated_ready_date = "Wajib diisi jika status bukan Ready.";
    }
    if (s.stock_status === "READY" && s.estimated_ready_date) {
      e.estimated_ready_date = "Kosongkan jika status Ready.";
    }
    return e;
  };
  const validateTool = (t: Tool): ToolErr => {
    const e: ToolErr = {};
    if (!t.tool_name?.trim()) e.tool_name = "Nama tool wajib diisi.";
    if (t.qty == null || Number(t.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    return e;
  };
  const validateMan = (m: Manpower): ManErr => {
    const e: ManErr = {};
    if (!m.skill_required?.trim()) e.skill_required = "Skill/Nama wajib diisi.";
    if (m.qty == null || Number(m.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    return e;
  };

  const validateAll = () => {
    let ok = true;
    if (backlog?.need_sparepart) {
      const em: Record<number, SpareErr> = {};
      spares.forEach((s, i) => {
        const e = validateSpare(s);
        if (Object.keys(e).length) em[i] = e;
      });
      setSpErr(em);
      if (Object.keys(em).length) ok = false;
    } else setSpErr({});
    if (backlog?.need_tools) {
      const em: Record<number, ToolErr> = {};
      tools.forEach((t, i) => {
        const e = validateTool(t);
        if (Object.keys(e).length) em[i] = e;
      });
      setTlErr(em);
      if (Object.keys(em).length) ok = false;
    } else setTlErr({});
    if (backlog?.need_manpower) {
      const em: Record<number, ManErr> = {};
      manpower.forEach((m, i) => {
        const e = validateMan(m);
        if (Object.keys(e).length) em[i] = e;
      });
      setMpErr(em);
      if (Object.keys(em).length) ok = false;
    } else setMpErr({});
    return ok;
  };

  const save = async () => {
    if (!backlog || !id) return;
    if (!validateAll()) {
      alert("Periksa kembali field yang belum valid.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // === HANDLE OFF TOGGLES: hapus semua jika toggle OFF ===
      if (!backlog.need_sparepart) {
        await supabase.from("backlog_spareparts").delete().eq("backlog_id", id);
      }
      if (!backlog.need_tools) {
        await supabase.from("backlog_tools").delete().eq("backlog_id", id);
      }
      if (!backlog.need_manpower) {
        await supabase.from("backlog_manpower").delete().eq("backlog_id", id);
      }

      // diff delete + upsert
      if (backlog.need_sparepart) {
        const currentIds = spares.map((x) => x.id!).filter(Boolean) as UUID[];
        const toDelete = initSpareIds.filter((hid) => !currentIds.includes(hid));
        if (toDelete.length) await supabase.from("backlog_spareparts").delete().in("id", toDelete);

        if (spares.length) {
          const rows = spares.map((s) => ({
            id: s.id,
            backlog_id: id,
            part_number: s.part_number?.trim(),
            part_name: s.part_name?.trim(),
            qty: Number(s.qty ?? 0),
            stock_status: s.stock_status || null,
            estimated_ready_date: s.stock_status === "READY" ? null : s.estimated_ready_date || null,
            remarks: s.remarks || null,
            no_wr_pr: s.no_wr_pr || null,
            no_po: s.no_po || null,
          }));
          await supabase.from("backlog_spareparts").upsert(rows, { onConflict: "id" });
        }
      }

      if (backlog.need_tools) {
        const currentIds = tools.map((x) => x.id!).filter(Boolean) as UUID[];
        const toDelete = initToolIds.filter((hid) => !currentIds.includes(hid));
        if (toDelete.length) await supabase.from("backlog_tools").delete().in("id", toDelete);

        if (tools.length) {
          const rows = tools.map((t) => ({
            id: t.id,
            backlog_id: id,
            tool_name: t.tool_name?.trim(),
            specification: t.specification || null,
            qty: Number(t.qty ?? 0),
            remarks: t.remarks || null,
          }));
          await supabase.from("backlog_tools").upsert(rows, { onConflict: "id" });
        }
      }

      if (backlog.need_manpower) {
        const currentIds = manpower.map((x) => x.id!).filter(Boolean) as UUID[];
        const toDelete = initManIds.filter((hid) => !currentIds.includes(hid));
        if (toDelete.length) await supabase.from("backlog_manpower").delete().in("id", toDelete);

        if (manpower.length) {
          const rows = manpower.map((m) => ({
            id: m.id,
            backlog_id: id,
            skill_required: m.skill_required?.trim(),
            qty: Number(m.qty ?? 0),
            remarks: m.remarks || null,
          }));
          await supabase.from("backlog_manpower").upsert(rows, { onConflict: "id" });
        }
      }

      // update shutdown + status reviewed
// --- LOGIKA BARU UNTUK MENENTUKAN STATUS & NOTIFIKASI ---
      
      // 1. Tentukan status selanjutnya berdasarkan kondisi
      let nextStatus = 'reviewed';
      let notificationBody = `Backlog ${backlog.registration_code} butuh update dari tim Supply.`;
      let notificationTarget = 'supply';

      if (!backlog.need_sparepart) { // Jika TIDAK butuh part
        if (backlog.need_shutdown) { // DAN butuh shutdown
          nextStatus = 'menunggu_shutdown';
          notificationBody = `Backlog ${backlog.registration_code} siap dan membutuhkan jendela shutdown.`;
          notificationTarget = 'supervisor';
        } else { // DAN TIDAK butuh shutdown
          nextStatus = 'siap_dijadwalkan';
          notificationBody = `Backlog ${backlog.registration_code} siap untuk dijadwalkan eksekusinya.`;
          notificationTarget = 'supervisor';
        }
      }
      
      // 2. Update backlog utama dengan status yang sudah ditentukan
      await supabase
        .from("backlogs")
        .update({
          need_sparepart: backlog.need_sparepart,
          need_tools: backlog.need_tools,
          need_manpower: backlog.need_manpower,
          need_shutdown: backlog.need_shutdown,
          shutdown_required: backlog.need_shutdown ? !!backlog.shutdown_required : null,
          status: nextStatus, // <-- Menggunakan status dinamis
        })
        .eq("id", id);

      // 3. Kirim notifikasi yang sesuai
      await pushNotif({
        backlog_id: id,
        title: "Update Status Backlog",
        body: notificationBody,
        target_role: notificationTarget,
      });
        
      navigate("/backlog/review");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Gagal menyimpan");
      alert("Gagal menyimpan: " + (e?.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  
  // Toggle bersihkan state lokal agar UX konsisten
  const toggleNeed = (key: keyof Backlog, checked: boolean) => {
    if (!backlog) return;
    setBacklog({ ...backlog, [key]: checked } as Backlog);
    if (key === "need_sparepart" && !checked) { setSpares([]); setSpErr({}); }
    if (key === "need_tools" && !checked) { setTools([]); setTlErr({}); }
    if (key === "need_manpower" && !checked) { setManpower([]); setMpErr({}); }
  };

  if (loading) return <div className="p-4">Memuat…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!backlog) return <div className="p-4">Data tidak ditemukan.</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
<div>
  <h2 className="text-2xl font-semibold">Detail Review Backlog</h2>
  {/* Baris baru ditambahkan di sini */}
  <p className="text-sm text-gray-500 mt-1">
    Kode Registrasi: <span className="font-medium text-gray-700">{backlog.registration_code ?? "-"}</span>
  </p>
  <p className="text-sm text-gray-600 mt-2">
    Unit: <b>{backlog.unit_code}</b>
  </p>
  <p className="text-sm text-gray-600">Problem: {backlog.problem}</p>
</div>

      {/* Toggles (meniru EditBacklog) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={backlog.need_sparepart}
            onChange={(e) => toggleNeed("need_sparepart", e.target.checked)}
          />
          <span>Butuh Sparepart</span>
        </label>
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={backlog.need_tools}
            onChange={(e) => toggleNeed("need_tools", e.target.checked)}
          />
          <span>Butuh Tools</span>
        </label>
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={backlog.need_manpower}
            onChange={(e) => toggleNeed("need_manpower", e.target.checked)}
          />
          <span>Butuh Manpower</span>
        </label>
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={backlog.need_shutdown}
            onChange={(e) => setBacklog({ ...backlog, need_shutdown: e.target.checked })}
          />
          <span>Butuh Shutdown</span>
        </label>
      </div>

      {/* Spareparts */}
      {backlog.need_sparepart && (
        <section className="space-y-3">
          <SectionHeader title="Sparepart" />
          {spares.length === 0 && <div className="text-sm text-gray-500">Belum ada item. Tambahkan item pertama di bawah.</div>}
          {spares.map((s, i) => {
            const err = spErr[i] || {};
            const isReady = s.stock_status === "READY";
            return (
              <SectionCard
                key={s.id ?? `sp-${i}`}
                title="Sparepart"
                onRemove={() => removeRow(spares, setSpares, i, initSpareIds, setInitSpareIds)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Part Number</label>
                    <input
                      className={`w-full border rounded px-3 py-2 ${err.part_number ? "ring-1 ring-red-500" : ""}`}
                      placeholder="part number"
                      value={s.part_number}
                      onChange={(e) => updateRow(spares, setSpares, i, "part_number", e.target.value)}
                      onBlur={() => setSpErr((p) => ({ ...p, [i]: validateSpare(spares[i]) }))}
                    />
                    <FieldError msg={err.part_number} />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm mb-1">Part Name</label>
                    <input
                      className={`w-full border rounded px-3 py-2 ${err.part_name ? "ring-1 ring-red-500" : ""}`}
                      placeholder="part name"
                      value={s.part_name}
                      onChange={(e) => updateRow(spares, setSpares, i, "part_name", e.target.value)}
                      onBlur={() => setSpErr((p) => ({ ...p, [i]: validateSpare(spares[i]) }))}
                    />
                    <FieldError msg={err.part_name} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Qty</label>
                    <input
                      type="number"
                      className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                      min={0}
                      value={s.qty}
                      onChange={(e) => updateRow(spares, setSpares, i, "qty", Number(e.target.value))}
                      onBlur={() => setSpErr((p) => ({ ...p, [i]: validateSpare(spares[i]) }))}
                    />
                    <FieldError msg={err.qty} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Stock Status</label>
                    <select
                      className={`w-full border rounded px-3 py-2 bg-white ${err.stock_status ? "ring-1 ring-red-500" : ""}`}
                      value={s.stock_status ?? ""}
                      onChange={(e) => updateRow(spares, setSpares, i, "stock_status", e.target.value || "")}
                      onBlur={() => setSpErr((p) => ({ ...p, [i]: validateSpare(spares[i]) }))}
                    >
                      <option value="">Pilih status</option>
                      {STOCK_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <FieldError msg={err.stock_status} />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">No WR/PR</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={s.no_wr_pr ?? ""}
                      onChange={(e) => updateRow(spares, setSpares, i, "no_wr_pr", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">No PO</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={s.no_po ?? ""}
                      onChange={(e) => updateRow(spares, setSpares, i, "no_po", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Estimated Ready</label>
                    <input
                      type="date"
                      className={`w-full border rounded px-3 py-2 ${err.estimated_ready_date ? "ring-1 ring-red-500" : ""} ${
                        isReady ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      value={s.estimated_ready_date ?? ""}
                      onChange={(e) => updateRow(spares, setSpares, i, "estimated_ready_date", e.target.value)}
                      onBlur={() => setSpErr((p) => ({ ...p, [i]: validateSpare(spares[i]) }))}
                      disabled={isReady}
                    />
                    <FieldError msg={err.estimated_ready_date} />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Remarks</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={s.remarks ?? ""}
                      onChange={(e) => updateRow(spares, setSpares, i, "remarks", e.target.value)}
                    />
                  </div>

                  {/* --- Blok Tampilan Gambar Baru --- */}
<div className="md:col-span-12 mt-2">
  <label className="block text-sm mb-1">Gambar Part</label>
  {s.image_url ? (
    <a href={s.image_url} target="_blank" rel="noopener noreferrer">
      <img src={s.image_url} alt="Foto Part" className="h-20 w-20 object-cover rounded border" />
    </a>
  ) : (
    <p className="text-sm text-gray-500">- Tidak ada gambar -</p>
  )}
</div>
                  
                </div>
              </SectionCard>
            );
          })}
          <Button
            type="button"
            onClick={() =>
              addRow<Spare>(
                () => ({
                  part_number: "",
                  part_name: "",
                  qty: 1,
                  stock_status: "",
                  estimated_ready_date: "",
                  remarks: "",
                  no_wr_pr: "",
                  no_po: "",
                }),
                setSpares
              )
            }
          >
            + Tambah Sparepart
          </Button>
        </section>
      )}

      {/* Tools */}
      {backlog.need_tools && (
        <section className="space-y-3">
          <SectionHeader title="Special Tools" />
          {tools.length === 0 && <div className="text-sm text-gray-500">Belum ada tool.</div>}
          {tools.map((t, i) => {
            const err = tlErr[i] || {};
            return (
              <SectionCard
                key={t.id ?? `tl-${i}`}
                title="Tool"
                onRemove={() => removeRow(tools, setTools, i, initToolIds, setInitToolIds)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="block text-sm mb-1">Tool</label>
                    <input
                      className={`w-full border rounded px-3 py-2 ${err.tool_name ? "ring-1 ring-red-500" : ""}`}
                      placeholder="tool_name"
                      value={t.tool_name}
                      onChange={(e) => updateRow(tools, setTools, i, "tool_name", e.target.value)}
                      onBlur={() => setTlErr((p) => ({ ...p, [i]: validateTool(tools[i]) }))}
                    />
                    <FieldError msg={err.tool_name} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Specification</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      placeholder="opsional"
                      value={t.specification ?? ""}
                      onChange={(e) => updateRow(tools, setTools, i, "specification", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Qty</label>
                    <input
                      type="number"
                      className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                      min={0}
                      value={t.qty}
                      onChange={(e) => updateRow(tools, setTools, i, "qty", Number(e.target.value))}
                      onBlur={() => setTlErr((p) => ({ ...p, [i]: validateTool(tools[i]) }))}
                    />
                    <FieldError msg={err.qty} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Remarks</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={t.remarks ?? ""}
                      onChange={(e) => updateRow(tools, setTools, i, "remarks", e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>
            );
          })}
          <Button
            type="button"
            onClick={() =>
              addRow<Tool>(
                () => ({
                  tool_name: "",
                  specification: "",
                  qty: 1,
                  remarks: "",
                }),
                setTools
              )
            }
          >
            + Tambah Tools
          </Button>
        </section>
      )}

      {/* Manpower */}
      {backlog.need_manpower && (
        <section className="space-y-3">
          <SectionHeader title="Additional Manpower" />
          {manpower.length === 0 && <div className="text-sm text-gray-500">Belum ada manpower.</div>}
          {manpower.map((m, i) => {
            const err = mpErr[i] || {};
            return (
              <SectionCard
                key={m.id ?? `mp-${i}`}
                title="Manpower"
                onRemove={() => removeRow(manpower, setManpower, i, initManIds, setInitManIds)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-7">
                    <label className="block text-sm mb-1">Skill/Nama</label>
                    <input
                      className={`w-full border rounded px-3 py-2 ${err.skill_required ? "ring-1 ring-red-500" : ""}`}
                      placeholder="Mekanik / Welder / Nama"
                      value={m.skill_required}
                      onChange={(e) => updateRow(manpower, setManpower, i, "skill_required", e.target.value)}
                      onBlur={() => setMpErr((p) => ({ ...p, [i]: validateMan(manpower[i]) }))}
                    />
                    <FieldError msg={err.skill_required} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Qty</label>
                    <input
                      type="number"
                      className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                      min={0}
                      value={m.qty}
                      onChange={(e) => updateRow(manpower, setManpower, i, "qty", Number(e.target.value))}
                      onBlur={() => setMpErr((p) => ({ ...p, [i]: validateMan(manpower[i]) }))}
                    />
                    <FieldError msg={err.qty} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Remarks</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={m.remarks ?? ""}
                      onChange={(e) => updateRow(manpower, setManpower, i, "remarks", e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>
            );
          })}
          <Button
            type="button"
            onClick={() =>
              addRow<Manpower>(
                () => ({
                  skill_required: "",
                  qty: 1,
                  remarks: "",
                }),
                setManpower
              )
            }
          >
            + Tambah Manpower
          </Button>
        </section>
      )}

      {/* Shutdown */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold">Shutdown</h3>
        <label className="text-sm inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={backlog.need_shutdown}
            onChange={(e) => setBacklog({ ...backlog, need_shutdown: e.target.checked })}
          />
          <span>Butuh Shutdown</span>
        </label>

        {backlog.need_shutdown && (
          <div className="flex items-center gap-4">
            <span className="text-sm">Shutdown Required?</span>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="sdreq"
                checked={!!backlog.shutdown_required}
                onChange={() => setBacklog({ ...backlog, shutdown_required: true })}
              />
              Ya
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="sdreq"
                checked={backlog.shutdown_required === false}
                onChange={() => setBacklog({ ...backlog, shutdown_required: false })}
              />
              Tidak
            </label>
          </div>
        )}
        
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" disabled={saving} onClick={() => navigate(-1)}>
          Batal
        </Button>
        <Button disabled={!canSave} onClick={save} className="bg-green-600 hover:bg-green-700">
          {saving ? "Menyimpan..." : "Simpan Hasil Review"}
        </Button>
      </div>
      </div>
  );
};

export default BacklogReviewDetail;
