// src/utils/notif.ts
import { supabase } from "@/lib/supabase";

export type PushNotifOpts = {
  backlog_id?: string | null;
  title?: string | null;
  body?: string | null;
  target_role?: string | null;  // contoh: "planner", "sm", "supervisor"
  target_user?: string | null;  // optional: kirim langsung ke user.id tertentu
};

/**
 * Simpan notifikasi secara konsisten.
 * - Selalu mengisi title & body (fallback aman).
 * - target_role disimpan lowercase agar mudah difilter.
 * - is_read diset false.
 */
export async function pushNotif(opts: PushNotifOpts) {
  const payload = {
    backlog_id: opts.backlog_id ?? null,
    title: (opts.title ?? "").trim() || "Notifikasi",
    body: (opts.body ?? "").trim() || "-",
    target_role: opts.target_role ? String(opts.target_role).toLowerCase() : null,
    target_user: opts.target_user ?? null,
    is_read: false,
  };

  const { error } = await supabase.from("notifications").insert(payload);
  if (error) throw error;
}

// Alias agar kompatibel dengan import lain yang memakai nama berbeda
export const pushNotification = pushNotif;

// Optional: default export bila ada yang import default
export default { pushNotif, pushNotification };
