import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Equipment {
  id: string;
  name: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const WeeklyCheckForm: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [intervalDays, setIntervalDays] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data, error } = await supabase.from('equipment').select('id, name');
    if (error) {
      console.error('Failed to fetch equipment:', error.message);
    } else {
      setEquipmentList(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('weekly_check_schedule').insert({
      equipment_id: equipmentId,
      plan_date: planDate,
      interval_days: intervalDays,
    });

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-xl font-semibold mb-4">Tambah Jadwal Pit Stop</h2>

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Pilih Unit
        </label>
        <select
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        >
          <option value="">-- Pilih Unit --</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </select>

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Plan Date
        </label>
        <input
          type="date"
          value={planDate}
          onChange={(e) => setPlanDate(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Interval Hari (contoh: 7)
        </label>
        <input
          type="number"
          value={intervalDays}
          onChange={(e) => setIntervalDays(Number(e.target.value))}
          className="w-full p-2 mb-4 border rounded"
          min={1}
          required
        />

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WeeklyCheckForm;
