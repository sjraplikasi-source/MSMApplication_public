// =============================
// src/context/AuthContext.tsx
// =============================

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";


interface UserType {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

interface AuthContextType {
  user: UserType | null;
  login: (email: string, password: string) => Promise<void>;
  registerWithProfile: (
    email: string,
    password: string,
    name: string,
    role?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (id: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Gagal fetch user profile:", error.message);
    }
    if (data) setUser(data as UserType);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (!mounted) return;
      if (sessionUser) {
        await fetchUserProfile(sessionUser.id);
      } else {
        setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await fetchUserProfile(data.user.id);
    } else {
      setLoading(false);
    }
  };

  const registerWithProfile = async (
    email: string,
    password: string,
    name: string,
    role: string = "user"
  ) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setLoading(false);
      throw new Error(error?.message || "Gagal registrasi akun");
    }

    const { id } = data.user;
    const { error: insertError } = await supabase
      .from("users")
      .upsert({ id, email, name, role });

    if (insertError) {
      setLoading(false);
      throw new Error("Gagal menambahkan pengguna ke tabel users: " + insertError.message);
    }

    await fetchUserProfile(id);
  };

  // --- HAPUS TOKEN LOKAL TANPA MEMANGGIL ENDPOINT LOGOUT ---
  const hardLocalSignOut = () => {
    try {
      // 1) Hapus key storage yang dipakai supabase-js v2 (sb-<ref>-auth-token)
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (/^sb-[a-z0-9\-]+-auth-token$/i.test(k)) {
          toRemove.push(k);
        }
      }
      // 2) Hapus kemungkinan key lama (v1)
      toRemove.push("supabase.auth.token");
      toRemove.forEach((k) => localStorage.removeItem(k));

      // 3) Trigger storage event untuk tab lain (opsional)
      localStorage.setItem("app:logout", String(Date.now()));
      localStorage.removeItem("app:logout");
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // IMPORTANT: Jangan panggil supabase.auth.signOut() sama sekali,
      // supaya tidak ada request ke /auth/v1/logout (menghindari 403 session_not_found).
      hardLocalSignOut();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, registerWithProfile, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
