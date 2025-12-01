// src/pages/Backlog/ShutdownPlanner.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Edit2, Trash2, Download } from 'lucide-react';
import { exportShutdownSchedule } from '@/utils/exportShutdownSchedule';

type ShutdownEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
};

const ShutdownPlanner: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<ShutdownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ShutdownEvent | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shutdown_events')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ❗ Jangan letakkan sebelum hooks lain.
// Guard tepat sebelum render:
if (user?.role === "mechanic") {
  return (
    <p className="p-4 text-red-600">
      Akses ditolak. Halaman ini tidak tersedia untuk mekanik.
    </p>
  );
}

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  const openModalForNew = () => {
    setEditingEvent(null);
    setForm({ title: '', description: '', start_time: '', end_time: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = (event: ShutdownEvent) => {
    setEditingEvent(event);
    setForm({
        title: event.title,
        description: event.description || '',
        start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_time || !form.end_time) {
      alert('Judul, Waktu Mulai, dan Waktu Selesai wajib diisi.');
      return;
    }
    setIsSaving(true);
    
    try {
      let error;
      if (editingEvent) {
        // Mode UPDATE
        ({ error } = await supabase
          .from('shutdown_events')
          .update({ title: form.title, description: form.description, start_time: form.start_time, end_time: form.end_time })
          .eq('id', editingEvent.id));
      } else {
        // Mode INSERT
        ({ error } = await supabase
          .from('shutdown_events')
          .insert({ ...form, created_by: user?.id }));
      }
      if (error) throw error;

      alert(`Event shutdown berhasil ${editingEvent ? 'diperbarui' : 'dibuat'}!`);
      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus event shutdown ini? Backlog yang tertaut akan kehilangan jadwal shutdown-nya.")) {
        try {
            const { error } = await supabase.from('shutdown_events').delete().eq('id', eventId);
            if (error) throw error;
            alert('Event berhasil dihapus.');
            fetchEvents();
        } catch (err: any) {
            alert(`Gagal menghapus: ${err.message}`);
        }
    }
  };

  const handleDownload = async (eventId: string, eventTitle: string) => {
    setIsDownloading(true);
    try {
        await exportShutdownSchedule(eventId, eventTitle);
    } catch (e: any) {
        alert(e.message || "Gagal mengunduh file Excel.");
    } finally {
        setIsDownloading(false);
    }
  };

  if (loading) return <div className="p-4">Memuat data shutdown...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Shutdown Planner</h2>
        <button onClick={openModalForNew} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Buat Event Shutdown Baru
        </button>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="p-3 text-left">Judul Shutdown</th>
              <th className="p-3 text-left">Waktu Mulai</th>
              <th className="p-3 text-left">Waktu Selesai</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Belum ada event shutdown yang direncanakan.</td></tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{event.title}</td>
                  <td className="p-3">{format(new Date(event.start_time), 'dd MMM yyyy, HH:mm')}</td>
                  <td className="p-3">{format(new Date(event.end_time), 'dd MMM yyyy, HH:mm')}</td>
                  <td className="p-3"><span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">{event.status}</span></td>
                  <td className="p-3">
                    <div className="flex gap-3">
                        <button onClick={() => handleDownload(event.id, event.title)} className="text-gray-500 hover:text-green-600" title="Download Jadwal" disabled={isDownloading}>
                            <Download size={16} />
                        </button>
                        <button onClick={() => openModalForEdit(event)} className="text-gray-500 hover:text-blue-600" title="Edit Event"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(event.id)} className="text-gray-500 hover:text-red-600" title="Hapus Event"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{editingEvent ? 'Edit Event Shutdown' : 'Event Shutdown Baru'}</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Judul Event</label>
              <input name="title" value={form.title} onChange={handleInputChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Waktu Mulai</label>
                <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleInputChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Waktu Selesai</label>
                <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleInputChange} className="w-full border rounded px-3 py-2" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi (Opsional)</label>
              <textarea name="description" value={form.description} onChange={handleInputChange} className="w-full border rounded px-3 py-2" rows={3}></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="border rounded px-4 py-2 hover:bg-gray-100" disabled={isSaving}>Batal</button>
              <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ShutdownPlanner;
