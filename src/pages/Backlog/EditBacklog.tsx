// =============================
// src/pages/Backlog/EditBacklog.tsx
// =============================
import React, { useState, useEffect, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Select from "react-select";

type UUID = string;
const cid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const priorityOptions = [
  { value: 'High', label: 'High - Kritis (Unit bisa breakdown < 1 minggu)' },
  { value: 'Medium', label: 'Medium - Tinggi (Unit bisa breakdown < 1 bulan)' },
  { value: 'Low', label: 'Low - Normal (Unit bisa bertahan > 1 bulan)' },
  { value: 'Improve', label: 'Improve - Improvement (Modifikasi/Project)' },
];

// ===== Top-level small components (stabil) =====
const FieldError = memo<{ msg?: string }>(({ msg }) =>
  msg ? <p className="text-xs text-red-600 mt-1">{msg}</p> : null
);

const SectionCard = memo<{
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
}>(({ title, onRemove, children }) => (
  <div className="border rounded-lg">
    <div className="flex items-center justify-between px-4 py-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {onRemove && (
        <button type="button" className="text-red-600 hover:underline" onClick={onRemove}>
          Hapus
        </button>
      )}
    </div>
    <div className="px-4 pb-4">{children}</div>
  </div>
));

// ===== Header =====
type BacklogHeader = {
  id: UUID;
  unit_code: string;
  date: string; // yyyy-mm-dd
  problem: string;
  priority: string; // tambahkan priority
  need_sparepart: boolean;
  need_tools: boolean;
  need_manpower: boolean;
  need_shutdown: boolean;
};

type WithCid = { _cid: string };

// ===== Detail types (sesuai skema DB) =====
export type SparePartRow = WithCid & {
  id?: UUID;
  backlog_id?: UUID;
  part_number: string;
  part_name: string;
  qty: number;
  remarks?: string | null;
  stock_status?: string | null; // text
  estimated_ready_date?: string | null; // yyyy-mm-dd
  no_wr_pr?: string | null;
  no_po?: string | null;
  created_at?: string | null;
  image_url?: string | null; // <-- Tambahkan ini
  uploading?: boolean;       // <-- Tambahkan ini
};

type ToolRow = WithCid & {
  id?: UUID;
  backlog_id?: UUID;
  tool_name: string;
  specification?: string | null;
  qty: number;
  remarks?: string | null;
  created_at?: string | null;
};

type ManpowerRow = WithCid & {
  id?: UUID;
  backlog_id?: UUID;
  skill_required: string;
  qty: number;
  remarks?: string | null;
  created_at?: string | null;
};

type ShutdownRow = WithCid & {
  id?: UUID;
  backlog_id?: UUID;
  activity_name: string;
  qty: number;
  remarks?: string | null;
};

// ===== Error maps =====
type SpareFieldError = {
  part_number?: string;
  part_name?: string;
  qty?: string;
  stock_status?: string;
  estimated_ready_date?: string;
};
type ToolFieldError = { tool_name?: string; qty?: string };
type ManFieldError = { skill_required?: string; qty?: string };
type ShutFieldError = { activity_name?: string; qty?: string };

const STOCK_STATUS_OPTIONS = [
  { value: "READY", label: "Ready" },
  { value: "ORDER", label: "Indent/Order" },
  { value: "NOSTOCK", label: "Tidak Ada Stok" },
] as const;

// ====== Util sinkronisasi child rows (hapus → insert baru tanpa id → upsert yang punya id) ======
async function syncRows<T extends { id?: string }>(
  table: "backlog_spareparts" | "backlog_tools" | "backlog_manpower" | "backlog_shutdown",
  current: T[],
  initialIds: string[],
  mapForDb: (r: T) => any
) {
  // hitung yang dihapus
  const nowIds = current.map((r) => r.id!).filter(Boolean) as string[];
  const toDelete = initialIds.filter((x) => !nowIds.includes(x));
  if (toDelete.length) {
    const { error } = await supabase.from(table).delete().in("id", toDelete);
    if (error) throw error;
  }

  // petakan untuk DB
  const mapped = current.map(mapForDb);

  // pisahkan insert & update
  const forInsert = mapped
    .filter((r: any) => !r.id)
    .map(({ id, ...rest }: any) => rest);
  const forUpdate = mapped.filter((r: any) => !!r.id);

  if (forInsert.length) {
    const { error } = await supabase.from(table).insert(forInsert);
    if (error) throw error;
  }
  if (forUpdate.length) {
    const { error } = await supabase.from(table).upsert(forUpdate, { onConflict: "id" });
    if (error) throw error;
  }
}

const EditBacklog: React.FC = () => {
  const { id } = useParams<{ id: UUID }>();
  const navigate = useNavigate();

  // ===== UI state =====
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // ===== Header form =====
  const [unitCode, setUnitCode] = useState("");
  const [date, setDate] = useState("");
  const [problem, setProblem] = useState("");

  const [needSparepart, setNeedSparepart] = useState(false);
  const [needTools, setNeedTools] = useState(false);
  const [needManpower, setNeedManpower] = useState(false);
  const [needShutdown, setNeedShutdown] = useState(false);

  // STATE UNTUK PRIORITAS HARUS DI SINI
  const [selectedPriority, setSelectedPriority] = useState<{ value: string, label: string } | null>(null);

  // <-- BARU: State untuk dropdown equipment -->
  const [equipmentOptions, setEquipmentOptions] = useState<{value: string, label: string}[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<{value: string, label: string} | null>(null);

  // ===== Lists =====
  const [sparepartList, setSparepartList] = useState<SparePartRow[]>([]);
  const [toolsList, setToolsList] = useState<ToolRow[]>([]);
  const [manpowerList, setManpowerList] = useState<ManpowerRow[]>([]);
  const [shutdownList, setShutdownList] = useState<ShutdownRow[]>([]);

  // ===== Initial IDs for diff delete =====
  const [initSpareIds, setInitSpareIds] = useState<UUID[]>([]);
  const [initToolIds, setInitToolIds] = useState<UUID[]>([]);
  const [initManIds, setInitManIds] = useState<UUID[]>([]);
  const [initShutIds, setInitShutIds] = useState<UUID[]>([]);

  // ===== Error maps (key = _cid) =====
  const [spareErrors, setSpareErrors] = useState<Record<string, SpareFieldError>>({});
  const [toolErrors, setToolErrors] = useState<Record<string, ToolFieldError>>({});
  const [manErrors, setManErrors] = useState<Record<string, ManFieldError>>({});
  const [shutErrors, setShutErrors] = useState<Record<string, ShutFieldError>>({});

  // ===== Validators =====
  const validateSpareItem = (item: SparePartRow): SpareFieldError => {
    const e: SpareFieldError = {};
    if (!item.part_number?.trim()) e.part_number = "Part number wajib diisi.";
    if (!item.part_name?.trim()) e.part_name = "Part name wajib diisi.";
    if (item.qty == null || Number(item.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    if (!item.stock_status?.trim()) e.stock_status = "Pilih stock status.";
    if (item.stock_status === "READY" && item.estimated_ready_date) {
      e.estimated_ready_date = "Kosongkan jika status Ready.";
    }
    if ((item.stock_status === "ORDER" || item.stock_status === "NOSTOCK") && !item.estimated_ready_date) {
      e.estimated_ready_date = "Wajib diisi jika status bukan Ready.";
    }
    return e;
  };
  const validateToolItem = (item: ToolRow): ToolFieldError => {
    const e: ToolFieldError = {};
    if (!item.tool_name?.trim()) e.tool_name = "Nama tool wajib diisi.";
    if (item.qty == null || Number(item.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    return e;
  };
  const validateManItem = (item: ManpowerRow): ManFieldError => {
    const e: ManFieldError = {};
    if (!item.skill_required?.trim()) e.skill_required = "Skill/Nama wajib diisi.";
    if (item.qty == null || Number(item.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    return e;
  };
  const validateShutItem = (item: ShutdownRow): ShutFieldError => {
    const e: ShutFieldError = {};
    if (!item.activity_name?.trim()) e.activity_name = "Aktivitas wajib diisi.";
    if (item.qty == null || Number(item.qty) <= 0) e.qty = "Qty harus ≥ 1.";
    return e;
  };

  const handleImageUpload = async (file: File, cid: string) => {
  if (!file) return;

  setSparepartList(prev => prev.map(sp => 
    sp._cid === cid ? { ...sp, uploading: true } : sp
  ));

  try {
    const filePath = `public/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('sparepart-images') // Pastikan nama bucket sudah benar
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('sparepart-images')
      .getPublicUrl(filePath);

    setSparepartList(prev => prev.map(sp => 
      sp._cid === cid ? { ...sp, image_url: data.publicUrl, uploading: false } : sp
    ));

  } catch (error) {
    console.error("Gagal upload gambar:", error);
    alert("Gagal mengupload gambar.");
    setSparepartList(prev => prev.map(sp => 
      sp._cid === cid ? { ...sp, uploading: false } : sp
    ));
  }
};
  
  const validateAll = () => {
    let ok = true;

    if (needSparepart) {
      const errs: Record<string, SpareFieldError> = {};
      sparepartList.forEach((it) => {
        const e = validateSpareItem(it);
        if (Object.keys(e).length) errs[it._cid] = e;
      });
      setSpareErrors(errs);
      if (Object.keys(errs).length) ok = false;
    } else setSpareErrors({});

    if (needTools) {
      const errs: Record<string, ToolFieldError> = {};
      toolsList.forEach((it) => {
        const e = validateToolItem(it);
        if (Object.keys(e).length) errs[it._cid] = e;
      });
      setToolErrors(errs);
      if (Object.keys(errs).length) ok = false;
    } else setToolErrors({});

    if (needManpower) {
      const errs: Record<string, ManFieldError> = {};
      manpowerList.forEach((it) => {
        const e = validateManItem(it);
        if (Object.keys(e).length) errs[it._cid] = e;
      });
      setManErrors(errs);
      if (Object.keys(errs).length) ok = false;
    } else setManErrors({});

    if (needShutdown) {
      const errs: Record<string, ShutFieldError> = {};
      shutdownList.forEach((it) => {
        const e = validateShutItem(it);
        if (Object.keys(e).length) errs[it._cid] = e;
      });
      setShutErrors(errs);
      if (Object.keys(errs).length) ok = false;
    } else setShutErrors({});

    return ok;
  };

  // useEffect baru untuk mengambil data equipment
  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase.from('equipment').select('id, code, name');
      if (data) {
        const options = data.map((e: any) => ({ 
          value: e.code, 
          label: `${e.code} — ${e.name}` 
        }));
        setEquipmentOptions(options);
      }
    };
    fetchEquipment();
  }, []);

  // useEffect untuk mensinkronkan unit_code dengan selectedEquipment
  useEffect(() => {
    if (unitCode && equipmentOptions.length > 0) {
      const currentEquipment = equipmentOptions.find(opt => opt.value === unitCode);
      setSelectedEquipment(currentEquipment || null);
    }
  }, [unitCode, equipmentOptions]);
  
  // ===== Load all (sesuai skema) =====
  useEffect(() => {
    const load = async () => {
      try {
        // Header
        const { data: bl, error: e1 } = await supabase
          .from("backlogs")
          .select("*")
          .eq("id", id)
          .maybeSingle<BacklogHeader>();
        if (e1) throw e1;
        if (!bl) throw new Error("Backlog tidak ditemukan.");

        setUnitCode(bl.unit_code ?? "");
        setDate((bl.date || "").slice(0, 10));
        setProblem(bl.problem ?? "");
        setNeedSparepart(!!bl.need_sparepart);
        setNeedTools(!!bl.need_tools);
        setNeedManpower(!!bl.need_manpower);
        setNeedShutdown(!!bl.need_shutdown);
        // INI PENTING: SET PRIORITAS SAAT DATA DIMUAT
        const currentPriority = priorityOptions.find(opt => opt.value === bl.priority);
        setSelectedPriority(currentPriority || null);

        // Details
        const [sp, tl, mp, sd] = await Promise.all([
          supabase.from("backlog_spareparts").select("*").eq("backlog_id", id).order("created_at", { ascending: true }),
          supabase.from("backlog_tools").select("*").eq("backlog_id", id).order("created_at", { ascending: true }),
          supabase.from("backlog_manpower").select("*").eq("backlog_id", id).order("created_at", { ascending: true }),
          supabase.from("backlog_shutdown").select("*").eq("backlog_id", id).order("id", { ascending: true }),
        ]);

        if (sp.error) throw sp.error;
        if (tl.error) throw tl.error;
        if (mp.error) throw mp.error;
        if (sd.error) throw sd.error;

        const spRows: SparePartRow[] = (sp.data ?? []).map((r: any) => ({
          _cid: cid(),
          ...r,
          estimated_ready_date: r.estimated_ready_date ? String(r.estimated_ready_date).slice(0, 10) : null,
        }));
        setSparepartList(spRows);
        setInitSpareIds(spRows.map((r) => r.id!).filter(Boolean) as UUID[]);

        const tlRows: ToolRow[] = ((tl.data ?? []) as any[]).map((r) => ({ _cid: cid(), ...r })) as ToolRow[];
        setToolsList(tlRows);
        setInitToolIds(tlRows.map((r) => r.id!).filter(Boolean) as UUID[]);

        const mpRows: ManpowerRow[] = ((mp.data ?? []) as any[]).map((r) => ({ _cid: cid(), ...r })) as ManpowerRow[];
        setManpowerList(mpRows);
        setInitManIds(mpRows.map((r) => r.id!).filter(Boolean) as UUID[]);

        const sdRows: ShutdownRow[] = ((sd.data ?? []) as any[]).map((r) => ({ _cid: cid(), ...r })) as ShutdownRow[];
        setShutdownList(sdRows);
        setInitShutIds(sdRows.map((r) => r.id!).filter(Boolean) as UUID[]);
      } catch (err: any) {
        setNotice({ type: "err", msg: err?.message ?? "Gagal memuat data." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ===== Sparepart UI =====
// GANTI SELURUH FUNGSI INI

const renderSparepartList = (items: SparePartRow[]) => (
    <div className="mt-3 space-y-4">
        {items.length === 0 && <div className="text-sm text-gray-500">Belum ada item. Tambahkan item pertama di bawah.</div>}
        {items.map((item) => {
            const err = spareErrors[item._cid] || {};
            const isReady = item.stock_status === "READY";
            return (
                <SectionCard
                    key={item._cid}
                    title={`Sparepart: ${item.part_name || 'Item Baru'}`}
                    onRemove={() => {
                        setSparepartList((p) => p.filter((x) => x._cid !== item._cid));
                        setSpareErrors((p) => {
                            const c = { ...p };
                            delete c[item._cid];
                            return c;
                        });
                    }}
                >
                    {/* --- SEMUA INPUT FIELD YANG HILANG DIKEMBALIKAN DI SINI --- */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-3">
                            <label className="block text-sm mb-1">Part Number</label>
                            <input
                                className={`w-full border rounded px-3 py-2 ${err.part_number ? "ring-1 ring-red-500" : ""}`}
                                value={item.part_number}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, part_number: e.target.value } : r)))
                                }
                                onBlur={() =>
                                    setSpareErrors((pe) => ({
                                        ...pe,
                                        [item._cid]: validateSpareItem(sparepartList.find((x) => x._cid === item._cid)!),
                                    }))
                                }
                                placeholder="part number"
                            />
                            <FieldError msg={err.part_number} />
                        </div>
                        <div className="md:col-span-5">
                            <label className="block text-sm mb-1">Part Name</label>
                            <input
                                className={`w-full border rounded px-3 py-2 ${err.part_name ? "ring-1 ring-red-500" : ""}`}
                                value={item.part_name}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, part_name: e.target.value } : r)))
                                }
                                onBlur={() =>
                                    setSpareErrors((pe) => ({
                                        ...pe,
                                        [item._cid]: validateSpareItem(sparepartList.find((x) => x._cid === item._cid)!),
                                    }))
                                }
                                placeholder="part name"
                            />
                            <FieldError msg={err.part_name} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm mb-1">Qty</label>
                            <input
                                type="number"
                                className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                                min={0}
                                value={item.qty}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, qty: Number(e.target.value) } : r)))
                                }
                                onBlur={() =>
                                    setSpareErrors((pe) => ({
                                        ...pe,
                                        [item._cid]: validateSpareItem(sparepartList.find((x) => x._cid === item._cid)!),
                                    }))
                                }
                                placeholder="0"
                            />
                            <FieldError msg={err.qty} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm mb-1">Stock Status</label>
                            <select
                                className={`w-full border rounded px-3 py-2 bg-white ${err.stock_status ? "ring-1 ring-red-500" : ""}`}
                                value={item.stock_status || ""}
                                onChange={(e) =>
                                    setSparepartList((prev) =>
                                        prev.map((r) =>
                                            r._cid === item._cid
                                                ? { ...r, stock_status: e.target.value, estimated_ready_date: e.target.value === "READY" ? "" : r.estimated_ready_date }
                                                : r
                                        )
                                    )
                                }
                                onBlur={() =>
                                    setSpareErrors((pe) => ({
                                        ...pe,
                                        [item._cid]: validateSpareItem(sparepartList.find((x) => x._cid === item._cid)!),
                                    }))
                                }
                            >
                                <option value="">Pilih status</option>
                                {STOCK_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <FieldError msg={err.stock_status} />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm mb-1">No WR/PR</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={item.no_wr_pr || ""}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, no_wr_pr: e.target.value } : r)))
                                }
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm mb-1">No PO</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={item.no_po || ""}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, no_po: e.target.value } : r)))
                                }
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm mb-1">Estimated Ready</label>
                            <input
                                type="date"
                                className={`w-full border rounded px-3 py-2 ${err.estimated_ready_date ? "ring-1 ring-red-500" : ""} ${isReady ? "opacity-60 cursor-not-allowed" : ""}`}
                                value={item.estimated_ready_date || ""}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, estimated_ready_date: e.target.value } : r)))
                                }
                                onBlur={() =>
                                    setSpareErrors((pe) => ({
                                        ...pe,
                                        [item._cid]: validateSpareItem(sparepartList.find((x) => x._cid === item._cid)!),
                                    }))
                                }
                                disabled={isReady}
                            />
                            <FieldError msg={err.estimated_ready_date} />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm mb-1">Remarks</label>
                            <input
                                className="w-full border rounded px-3 py-2"
                                value={item.remarks || ""}
                                onChange={(e) =>
                                    setSparepartList((prev) => prev.map((r) => (r._cid === item._cid ? { ...r, remarks: e.target.value } : r)))
                                }
                            />
                        </div>
                    </div>

                    {/* Bagian Upload Gambar */}
                    <div className="mt-4 pt-3 border-t flex items-center gap-4">
                        <div>
                            <label htmlFor={`file-upload-${item._cid}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                                {item.uploading ? 'Mengupload...' : (item.image_url ? 'Ganti Gambar' : 'Upload Gambar')}
                            </label>
                            <input
                                id={`file-upload-${item._cid}`}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                disabled={item.uploading}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleImageUpload(e.target.files[0], item._cid);
                                    }
                                }}
                            />
                        </div>
                        {item.image_url && (
                            <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                                <img src={item.image_url} alt="Preview" className="h-12 w-12 object-cover rounded border" />
                            </a>
                        )}
                    </div>
                </SectionCard>
            );
        })}
        <button
            type="button"
            onClick={() => setSparepartList((p) => [...p, { _cid: cid(), part_number: "", part_name: "", qty: 1, remarks: null, stock_status: "", estimated_ready_date: "", no_wr_pr: null, no_po: null }])}
            className="w-full border border-dashed rounded px-3 py-2 hover:bg-gray-50"
        >
            + Tambah Item
        </button>
    </div>
);

  // ===== Manpower UI =====
  const renderManpower = (items: ManpowerRow[]) => (
    <div className="mt-3 space-y-4">
      {items.length === 0 && <div className="text-sm text-gray-500">Belum ada manpower.</div>}
      {items.map((it) => {
        const err = manErrors[it._cid] || {};
        return (
          <SectionCard
            key={it._cid}
            title="Manpower"
            onRemove={() => {
              setManpowerList((p) => p.filter((x) => x._cid !== it._cid));
              setManErrors((p) => {
                const c = { ...p };
                delete c[it._cid];
                return c;
              });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="block text-sm mb-1">Skill/Nama</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${err.skill_required ? "ring-1 ring-red-500" : ""}`}
                  value={it.skill_required}
                  onChange={(e) =>
                    setManpowerList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, skill_required: e.target.value } : r)))
                  }
                  onBlur={() =>
                    setManErrors((pe) => ({
                      ...pe,
                      [it._cid]: validateManItem(manpowerList.find((x) => x._cid === it._cid)!),
                    }))
                  }
                  placeholder="Mekanik / Welder / Nama"
                />
                <FieldError msg={err.skill_required} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Qty</label>
                <input
                  type="number"
                  className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                  min={0}
                  value={it.qty}
                  onChange={(e) =>
                    setManpowerList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, qty: Number(e.target.value) } : r)))
                  }
                  onBlur={() =>
                    setManErrors((pe) => ({
                      ...pe,
                      [it._cid]: validateManItem(manpowerList.find((x) => x._cid === it._cid)!),
                    }))
                  }
                />
                <FieldError msg={err.qty} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Remarks</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={it.remarks ?? ""}
                  onChange={(e) =>
                    setManpowerList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, remarks: e.target.value } : r)))
                  }
                />
              </div>
            </div>
          </SectionCard>
        );
      })}
      <button
        type="button"
        onClick={() => setManpowerList((p) => [...p, { _cid: cid(), skill_required: "", qty: 1, remarks: null }])}
        className="w-full border border-dashed rounded px-3 py-2 hover:bg-gray-50"
      >
        + Tambah Manpower
      </button>
    </div>
  );

  // ===== Shutdown UI =====
  const renderShutdown = (items: ShutdownRow[]) => (
    <div className="mt-3 space-y-4">
      {items.length === 0 && <div className="text-sm text-gray-500">Belum ada aktivitas shutdown.</div>}
      {items.map((it) => {
        const err = shutErrors[it._cid] || {};
        return (
          <SectionCard
            key={it._cid}
            title="Shutdown"
            onRemove={() => {
              setShutdownList((p) => p.filter((x) => x._cid !== it._cid));
              setShutErrors((p) => {
                const c = { ...p };
                delete c[it._cid];
                return c;
              });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="block text-sm mb-1">Aktivitas</label>
                <input
                  className={`w-full border rounded px-3 py-2 ${err.activity_name ? "ring-1 ring-red-500" : ""}`}
                  value={it.activity_name}
                  onChange={(e) =>
                    setShutdownList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, activity_name: e.target.value } : r)))
                  }
                  onBlur={() =>
                    setShutErrors((pe) => ({
                      ...pe,
                      [it._cid]: validateShutItem(shutdownList.find((x) => x._cid === it._cid)!),
                    }))
                  }
                  placeholder="mis. ganti valve, alignment, dll."
                />
                <FieldError msg={err.activity_name} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Qty</label>
                <input
                  type="number"
                  className={`w-full border rounded px-3 py-2 ${err.qty ? "ring-1 ring-red-500" : ""}`}
                  min={0}
                  value={it.qty}
                  onChange={(e) =>
                    setShutdownList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, qty: Number(e.target.value) } : r)))
                  }
                  onBlur={() =>
                    setShutErrors((pe) => ({
                      ...pe,
                      [it._cid]: validateShutItem(shutdownList.find((x) => x._cid === it._cid)!),
                    }))
                  }
                />
                <FieldError msg={err.qty} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Remarks</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={it.remarks ?? ""}
                  onChange={(e) =>
                    setShutdownList((prev) => prev.map((r) => (r._cid === it._cid ? { ...r, remarks: e.target.value } : r)))
                  }
                />
              </div>
            </div>
          </SectionCard>
        );
      })}
      <button
        type="button"
        onClick={() => setShutdownList((p) => [...p, { _cid: cid(), activity_name: "", qty: 1, remarks: null }])}
        className="w-full border border-dashed rounded px-3 py-2 hover:bg-gray-50"
      >
        + Tambah Aktivitas Shutdown
      </button>
    </div>
  );

  // ===== Save (header + semua detail via syncRows) =====
  const handleSave = async () => {
    try {
      setSaving(true);
      setNotice(null);

      if (!validateAll()) {
        setNotice({ type: "err", msg: "Periksa kembali field yang belum valid." });
        return;
      }

      // Header
      const { error: e1 } = await supabase
        .from("backlogs")
        .update({
          unit_code: selectedEquipment?.value || unitCode,
          date,
          problem,
          need_sparepart: needSparepart,
          need_tools: needTools,
          need_manpower: needManpower,
          need_shutdown: needShutdown,
          priority: selectedPriority?.value || null, // Perbaikan: Gunakan nilai dari state selectedPriority
        })
        .eq("id", id);
      if (e1) throw e1;

      // SPAREPARTS
      if (!needSparepart) {
        const { error } = await supabase.from("backlog_spareparts").delete().eq("backlog_id", id!);
        if (error) throw error;
      } else {
        await syncRows(
          "backlog_spareparts",
          sparepartList,
          initSpareIds,
          (s) => ({
  id: s.id,
  backlog_id: id,
  part_number: s.part_number?.trim(),
  part_name: s.part_name?.trim(),
  qty: Number(s.qty ?? 0),
  remarks: s.remarks || null,
  stock_status: s.stock_status || null,
  estimated_ready_date: s.stock_status === "READY" ? null : s.estimated_ready_date || null,
  no_wr_pr: s.no_wr_pr || null,
  no_po: s.no_po || null,
  image_url: s.image_url || null, // <-- Tambahkan baris ini
})
        );
      }

      // TOOLS
      if (!needTools) {
        const { error } = await supabase.from("backlog_tools").delete().eq("backlog_id", id!);
        if (error) throw error;
      } else {
        await syncRows(
          "backlog_tools",
          toolsList,
          initToolIds,
          (t) => ({
            id: t.id,
            backlog_id: id,
            tool_name: t.tool_name?.trim(),
            specification: t.specification || null,
            qty: Number(t.qty ?? 0),
            remarks: t.remarks || null,
          })
        );
      }

      // MANPOWER
      if (!needManpower) {
        const { error } = await supabase.from("backlog_manpower").delete().eq("backlog_id", id!);
        if (error) throw error;
      } else {
        await syncRows(
          "backlog_manpower",
          manpowerList,
          initManIds,
          (m) => ({
            id: m.id,
            backlog_id: id,
            skill_required: m.skill_required?.trim(),
            qty: Number(m.qty ?? 0),
            remarks: m.remarks || null,
          })
        );
      }

      // SHUTDOWN
      if (!needShutdown) {
        const { error } = await supabase.from("backlog_shutdown").delete().eq("backlog_id", id!);
        if (error) throw error;
      } else {
        await syncRows(
          "backlog_shutdown",
          shutdownList,
          initShutIds,
          (s) => ({
            id: s.id,
            backlog_id: id,
            activity_name: s.activity_name?.trim(),
            qty: Number(s.qty ?? 0),
            remarks: s.remarks || null,
          })
        );
      }

      setNotice({ type: "ok", msg: "Perubahan disimpan." });
      navigate(-1);
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message ?? "Gagal menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Memuat…</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Edit Backlog</h2>

      {notice && (
        <div
          className={`p-3 rounded border ${
            notice.type === "ok" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
        <label className="block text-sm font-medium mb-1">Unit Code</label>
        <Select
          options={equipmentOptions}
          value={selectedEquipment}
          onChange={(selected) => setSelectedEquipment(selected)}
          placeholder="Pilih atau cari unit..."
          isSearchable
        />
      </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">Tanggal</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {/* INPUT PRIORITY BARU DI SINI */}
        <div className="md:col-span-6">
          <label className="block text-sm font-medium mb-1">Priority</label>
          {/* Ganti dengan komponen select */}
          {/* Untuk menggunakan Select di sini, pastikan Bang Sarif sudah mengimpornya. */}
          {/* Misal, import Select dari 'react-select' atau komponen kustom Bang Sarif */}
          {/* Jika tidak ada komponen Select, ganti dengan <select> biasa */}
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={selectedPriority?.value || ""}
            onChange={(e) => {
              const newPriority = priorityOptions.find(opt => opt.value === e.target.value);
              setSelectedPriority(newPriority || null);
            }}
          >
            <option value="">Pilih Prioritas</option>
            {priorityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-12">
          <label className="block text-sm font-medium mb-1">Problem</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Deskripsikan masalah…"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={needSparepart} onChange={(e) => setNeedSparepart(e.target.checked)} />
          <span>Butuh Sparepart</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={needTools} onChange={(e) => setNeedTools(e.target.checked)} />
          <span>Butuh Tools</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={needManpower} onChange={(e) => setNeedManpower(e.target.checked)} />
          <span>Butuh Manpower</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={needShutdown} onChange={(e) => setNeedShutdown(e.target.checked)} />
          <span>Butuh Shutdown</span>
        </label>
      </div>

      {/* Sections */}
      {needSparepart && (
        <div>
          <h3 className="text-base font-semibold">Sparepart</h3>
          {renderSparepartList(sparepartList)}
        </div>
      )}

      {needTools && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">Tools</h3>
          {renderTools(toolsList)}
        </div>
      )}

      {needManpower && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">Manpower</h3>
          {renderManpower(manpowerList)}
        </div>
      )}

      {needShutdown && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">Shutdown</h3>
          {renderShutdown(shutdownList)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => navigate(-1)} className="border rounded px-4 py-2 hover:bg-gray-50">
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`rounded px-4 py-2 text-white ${saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
};

export default EditBacklog;