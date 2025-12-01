// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Ambil satu laporan berdasarkan id
export const getReportById = async (id: string) => {
  const { data, error } = await supabase
    .from("reports") // Ganti jika nama tabel Anda berbeda
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

// Update laporan berdasarkan id
export const updateReport = async (id: string, payload: any) => {
  const { error } = await supabase
    .from("reports")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
};

// Tambah laporan baru
export const createReport = async (payload: any) => {
  const { error } = await supabase
    .from("reports")
    .insert([payload]);
  if (error) throw error;
};

// (Opsional) Hapus laporan berdasarkan id
export const deleteReport = async (id: string) => {
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
};