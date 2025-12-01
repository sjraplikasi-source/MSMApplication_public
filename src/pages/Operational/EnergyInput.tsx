// src/pages/Operational/EnergyInput.tsx
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const EnergyInput: React.FC = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State untuk tab yang aktif: pln_gi, pln_gh, atau genset
  const [activeTab, setActiveTab] = useState<'pln_gi' | 'pln_gh' | 'genset'>('pln_gi');

  // State untuk input field
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [kwhValue, setKwhValue] = useState(''); // Satu state untuk nilai kWh
  
  // State khusus untuk form Genset
  const [kwhSUTM, setKwhSUTM] = useState('');
  const [kwhOPP, setKwhOPP] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi
    if (activeTab.startsWith('pln') && !kwhValue) {
      alert('Mohon isi field kWh Meter.');
      return;
    }
    if (activeTab === 'genset' && (!kwhSUTM || !kwhOPP)) {
      alert('Mohon isi kedua field untuk Genset.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const readingsToInsert = [];
    const readingTime = new Date(dateTime).toISOString();

    if (activeTab === 'pln_gi') {
      readingsToInsert.push({ meter_type: 'PLN_GI', reading_at: readingTime, reading_value: parseFloat(kwhValue), created_by: user?.id });
    } else if (activeTab === 'pln_gh') {
      readingsToInsert.push({ meter_type: 'PLN_GH', reading_at: readingTime, reading_value: parseFloat(kwhValue), created_by: user?.id });
    } else { // Genset
      readingsToInsert.push(
        { meter_type: 'GENSET_SUTM', reading_at: readingTime, reading_value: parseFloat(kwhSUTM), created_by: user?.id },
        { meter_type: 'GENSET_OPP', reading_at: readingTime, reading_value: parseFloat(kwhOPP), created_by: user?.id }
      );
    }

    try {
      const { error: insertError } = await supabase
        .from('energy_meter_readings')
        .insert(readingsToInsert);

      if (insertError) throw insertError;

      setSuccessMessage(`Data ${activeTab.replace('_', ' ').toUpperCase()} berhasil disimpan!`);
      // Reset form
      setKwhValue('');
      setKwhSUTM('');
      setKwhOPP('');

    } catch (err: any) {
      setError(`Gagal menyimpan data: ${err.message}. Mungkin data untuk tanggal dan jam ini sudah ada.`);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const TabButton = ({ tabName, label }) => (
    <button
      type="button"
      onClick={() => {
        setActiveTab(tabName);
        // Reset pesan saat ganti tab
        setError(null);
        setSuccessMessage(null);
      }}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
        activeTab === tabName
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Input Data kWh Meter</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border">
        
        <div className="border-b mb-4">
            <TabButton tabName="pln_gi" label="PLN GI" />
            <TabButton tabName="pln_gh" label="PLN GH" />
            <TabButton tabName="genset" label="Genset" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal & Jam Pencatatan</label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
            required
          />
        </div>

        {/* --- Form untuk PLN (GI & GH) --- */}
        {activeTab.startsWith('pln') && (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        kWh Meter {activeTab === 'pln_gi' ? 'GI' : 'GH'}
                    </label>
                    <input type="number" step="any" placeholder={`Masukkan angka meteran ${activeTab === 'pln_gi' ? 'GI' : 'GH'}`} value={kwhValue} onChange={e => setKwhValue(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>
            </div>
        )}

        {/* --- Form Genset --- */}
        {activeTab === 'genset' && (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">kWh Meter SUTM</label>
                    <input type="number" step="any" placeholder="Masukkan angka meteran SUTM" value={kwhSUTM} onChange={e => setKwhSUTM(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">kWh Meter OPP</label>
                    <input type="number" step="any" placeholder="Masukkan angka meteran OPP" value={kwhOPP} onChange={e => setKwhOPP(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>
            </div>
        )}
        
        <div className="mt-6">
            {successMessage && <div className="p-3 mb-4 bg-green-100 text-green-800 rounded-md text-center">{successMessage}</div>}
            {error && <div className="p-3 mb-4 bg-red-100 text-red-800 rounded-md text-center">{error}</div>}

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : `Simpan Data ${activeTab.replace('_', ' ').toUpperCase()}`}
            </button>
        </div>
      </form>
    </div>
  );
};

export default EnergyInput;
