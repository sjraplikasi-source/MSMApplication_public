// src/pages/RegisterUser.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

const RegisterUser = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    nrp: '',
    role: 'mechanic', // default
    username: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    // 1. Pastikan Admin masih memiliki session aktif
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      throw new Error(
        'Session Admin tidak ditemukan. Silakan login kembali.'
      );
    }

    // 2. Kirim permintaan registrasi ke Edge Function
    const { data, error: functionError } =
      await supabase.functions.invoke('register-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          nrp: form.nrp.trim(),
          username: form.username.trim(),
          role: form.role,
        },
      });

    // 3. Tangani error dari backend
    if (functionError) {
      console.error('REGISTER USER FUNCTION ERROR:', functionError);

      if (functionError instanceof FunctionsHttpError) {
        const errorBody = await functionError.context
          .json()
          .catch(() => null);

        throw new Error(
          errorBody?.error ||
          errorBody?.message ||
          functionError.message
        );
      }

      throw functionError;
    }

    if (!data?.success) {
      throw new Error(
        data?.error || 'Registrasi pengguna gagal.'
      );
    }

    // 4. Registrasi berhasil
    console.log('USER REGISTERED:', data);

    alert('Pengguna berhasil didaftarkan!');

    // Kembali ke halaman sebelumnya tanpa logout Admin
    navigate(-1);

  } catch (err: unknown) {
    console.error('REGISTRATION ERROR:', err);

    setError(
      err instanceof Error
        ? err.message
        : 'Terjadi kesalahan saat registrasi'
    );

  } finally {
    setLoading(false);
  }
};


  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Daftarkan Pengguna Baru</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" placeholder="Nama" className="border px-3 py-2 w-full" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
        <input type="text" placeholder="NRP" className="border px-3 py-2 w-full" value={form.nrp} onChange={(e) => handleChange('nrp', e.target.value)} />
        <input type="text" placeholder="Username" className="border px-3 py-2 w-full" value={form.username} onChange={(e) => handleChange('username', e.target.value)} />
        <input type="email" placeholder="Email" className="border px-3 py-2 w-full" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required />
        <input type="password" placeholder="Password" className="border px-3 py-2 w-full" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required />
        <select className="border px-3 py-2 w-full" value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
          <option value="mechanic">Mechanic</option>
          <option value="group_leader">Group Leader</option>
          <option value="planner">Planner</option>
          <option value="Supervisor">Supervisor</option>
          <option value="superintendent">Superintendent</option>
          <option value="admin">Admin</option>
          <option value="SM">SM</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={() => navigate(-1)} className="w-full bg-blue-600 text-white py-2 rounded">
          Batal
        </button>        
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
          {loading ? 'Mendaftarkan...' : 'Daftar'}
        </button>
      </form>
    </div>
  );
};

export default RegisterUser;
