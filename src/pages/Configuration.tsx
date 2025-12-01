// =============================
// src/pages/Configuration.tsx
// =============================

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';

const tables = [
  'action', 'activities', 'activity_type', 'area', 'diagnosis', 'equipment',
  'failure', 'finding', 'instruction', 'manpower', 'problems', 'reason', 'sub_component'
];

const Configuration = () => {
  const { user } = useAuth();
  const [selectedTable, setSelectedTable] = useState('equipment');
  const [items, setItems] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchItems();
  }, [selectedTable]);

  const fetchItems = async () => {
    const columns = selectedTable === 'equipment' ? 'id, name, code' : 'id, name';
    const { data, error } = await supabase.from(selectedTable).select(columns);
    if (!error) setItems(data || []);
  };

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    const payload: any = { name: newName };
    if (selectedTable === 'equipment') payload.code = newCode;
    const { error } = await supabase.from(selectedTable).insert(payload);
    if (error) setError(error.message);
    else {
      setNewName('');
      setNewCode('');
      fetchItems();
    }
    setLoading(false);
  };

  if (user?.role !== 'admin') {
    return <div className="p-6 text-red-600">Akses hanya untuk admin</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Konfigurasi Master Data</h2>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Pilih Tabel</label>
        <select
          className="border px-3 py-2"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          {tables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Nama</label>
        <input
          className="border px-3 py-2 w-full"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        {selectedTable === 'equipment' && (
          <>
            <label className="block mt-2 mb-1 font-medium">Kode</label>
            <input
              className="border px-3 py-2 w-full"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </>
        )}
        <button
          onClick={handleAdd}
          disabled={loading}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Menambahkan...' : 'Tambah Data'}
        </button>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Data Saat Ini:</h3>
        <ul className="list-disc pl-5">
          {items.map((item) => (
            <li key={item.id}>{selectedTable === 'equipment' ? `${item.code} - ${item.name}` : item.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Configuration;
