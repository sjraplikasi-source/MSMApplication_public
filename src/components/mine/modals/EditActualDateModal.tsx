import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generateNextWeeklyCheck } from '@/services/weeklyCheckScheduler';

interface Props {
  id: string;
  currentDate: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditActualDateModal: React.FC<Props> = ({ id, currentDate, onClose, onSuccess }) => {
  const [actualDate, setActualDate] = useState(currentDate || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('weekly_check_schedule')
      .update({ actual_date: actualDate })
      .eq('id', id);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      await generateNextWeeklyCheck(); // 👈 otomatis generate setelah actual diisi
      onSuccess(); // refresh tabel
      onClose();   // tutup modal
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Edit Actual Date</h2>

        <input
          type="date"
          value={actualDate || ''}
          onChange={(e) => setActualDate(e.target.value)}
          className="w-full p-2 border rounded mb-4"
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
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditActualDateModal;
