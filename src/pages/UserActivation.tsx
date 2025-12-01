// =============================
// src/pages/UserActivation.tsx
// =============================

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
}

const UserActivation = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert(`Gagal mengubah role: ${error.message}`);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
  };

  if (loading) return <p className="p-4">Memuat data pengguna...</p>;
  if (error) return <p className="text-red-600 p-4">{error}</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Manajemen Role Pengguna</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100 text-left text-sm">
              <th className="py-2 px-4 border">Email</th>
              <th className="py-2 px-4 border">Nama</th>
              <th className="py-2 px-4 border">Role</th>
              <th className="py-2 px-4 border">Dibuat</th>
              <th className="py-2 px-4 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 border">{user.email}</td>
                <td className="py-2 px-4 border">{user.name}</td>
                <td className="py-2 px-4 border">{user.role}</td>
                <td className="py-2 px-4 border">
                  {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                </td>
                <td className="py-2 px-4 border">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    className="border px-2 py-1 rounded text-sm"
                  >
                    <option value="user">User</option>
                    <option value="group_leader">Group Leader</option>
                    <option value="planner">Planner</option>
                    <option value="superintendent">Superintendent</option>
                    <option value="engineer">Engineer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                    <option value="admin">SM</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserActivation;
