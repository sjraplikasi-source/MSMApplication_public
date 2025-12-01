import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Notif = {
  id: string;
  backlog_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

const Notifications: React.FC = () => {
  const nav = useNavigate();

  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      // ambil semua notifikasi dari tabel — TANPA filter role
      let q = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (onlyUnread) {
        // unread saja: is_read = false atau null
        q = q.or("is_read.is.null,is_read.eq.false");
      }

      const { data, error } = await q;
      if (error) throw error;

      setRows((data || []) as Notif[]);
    } catch (e: any) {
      console.error("Gagal memuat notifikasi:", e);
      setErr(e?.message || "Gagal memuat notifikasi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread]);

  const markAllRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .or("is_read.is.null,is_read.eq.false");
      if (error) throw error;
      fetchAll();
    } catch (e: any) {
      alert("Gagal menandai semua dibaca: " + (e?.message || e));
    }
  };

  const onClickItem = async (n: Notif) => {
    try {
      // tandai dibaca
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    } catch {}
    // jika ada backlog, buka detailnya
    if (n.backlog_id) {
      nav(`/Backlog/detail/${n.backlog_id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Notifikasi</h2>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
            />
            Tampilkan yang belum dibaca
          </label>
          <button
            onClick={fetchAll}
            className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Tandai semua dibaca
          </button>
        </div>
      </div>

      {loading && <p>Memuat…</p>}
      {!loading && err && <p className="text-red-600">Error: {err}</p>}
      {!loading && !err && rows.length === 0 && <p>Tidak ada notifikasi.</p>}

      {!loading && !err && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((n) => (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={`w-full text-left border rounded p-3 hover:bg-gray-50 ${
                n.is_read ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                  {n.backlog_id && (
                    <div className="text-xs text-gray-500 mt-1">
                      Backlog ID: {n.backlog_id}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {n.created_at
                    ? new Date(n.created_at).toLocaleString()
                    : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
