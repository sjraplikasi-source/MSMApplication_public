// src/pages/Backlog/BacklogScheduling.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Select from "react-select";
import { pushNotif } from "../../utils/notif";

type Backlog = {
  id: string;
  registration_code: string | null;
  unit_code: string;
  problem: string;
  date: string;
};

type ManpowerOption = { value: string; label: string };
type ShutdownEventOption = { value: string; label: string };

const BacklogScheduling: React.FC = () => {
  const [schedulableBacklogs, setSchedulableBacklogs] = useState<Backlog[]>([]);
  const [shutdownBacklogs, setShutdownBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'reguler' | 'shutdown'>('reguler');

  const [selectedBacklog, setSelectedBacklog] = useState<Backlog | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedMechanics, setAssignedMechanics] = useState<ManpowerOption[]>([]);
  const [executionNotes, setExecutionNotes] = useState('');
  const [mechanicOptions, setMechanicOptions] = useState<ManpowerOption[]>([]);
  const [shutdownEvents, setShutdownEvents] = useState<ShutdownEventOption[]>([]);
  const [selectedShutdown, setSelectedShutdown] = useState<ShutdownEventOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: schedulableData, error: schedulableError } = await supabase
        .from('backlogs').select('id, registration_code, unit_code, problem, date').eq('status', 'siap_dijadwalkan').order('date', { ascending: true });

      const { data: shutdownData, error: shutdownError } = await supabase
        .from('backlogs').select('id, registration_code, unit_code, problem, date').eq('status', 'menunggu_shutdown').order('date', { ascending: true });

      const { data: mechanicsData, error: mechanicsError } = await supabase
        .from("manpower").select("id, name, nrp").order("name", { ascending: true });

      const { data: eventsData, error: eventsError } = await supabase
        .from("shutdown_events").select("id, title, start_time").eq('status', 'Direncanakan').order("start_time", { ascending: true });

      if (schedulableError || shutdownError || mechanicsError || eventsError) {
        setError(schedulableError?.message || shutdownError?.message || mechanicsError?.message || eventsError?.message);
      } else {
        setSchedulableBacklogs(schedulableData || []);
        setShutdownBacklogs(shutdownData || []);
        setMechanicOptions((mechanicsData || []).map((m: any) => ({ value: m.id, label: m.nrp ? `${m.name} / ${m.nrp}` : m.name })));
        setShutdownEvents((eventsData || []).map((e: any) => ({ value: e.id, label: `${new Date(e.start_time).toLocaleDateString()} - ${e.title}` })));
      }
      setLoading(false);
    };
    fetchData();
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

  const openSchedulingModal = (backlog: Backlog) => {
    setSelectedBacklog(backlog);
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setAssignedMechanics([]);
    setExecutionNotes('');
    setSelectedShutdown(null);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedBacklog || !scheduledDate || assignedMechanics.length === 0 || (activeTab === 'shutdown' && !selectedShutdown)) {
        alert("Semua field wajib diisi: Tanggal, Mekanik, dan Event Shutdown (jika perlu).");
        return;
    }
    setIsSaving(true);
    
    try {
        await supabase
            .from('backlogs')
            .update({
                status: 'dijadwalkan',
                scheduled_date: scheduledDate,
                execution_notes: executionNotes,
                scheduled_by: user?.id,
                scheduled_at: new Date().toISOString(),
                shutdown_event_id: selectedShutdown?.value || null,
            })
            .eq('id', selectedBacklog.id);

        await supabase.from('backlog_assignments').delete().eq('backlog_id', selectedBacklog.id);

        const assignments = assignedMechanics.map(m => ({
            backlog_id: selectedBacklog.id,
            manpower_id: m.value,
        }));
        await supabase.from('backlog_assignments').insert(assignments);

       // alert('Backlog berhasil dijadwalkan!');
        // Hapus dari list di UI
        if(activeTab === 'reguler') {
            setSchedulableBacklogs(prev => prev.filter(b => b.id !== selectedBacklog!.id));
        } else {
            setShutdownBacklogs(prev => prev.filter(b => b.id !== selectedBacklog!.id));
        }
        setSelectedBacklog(null);
        
        // Kirim notifikasi
    } catch (error: any) {
        alert(`Gagal menyimpan jadwal: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat data...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const currentList = activeTab === 'reguler' ? schedulableBacklogs : shutdownBacklogs;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Backlog Scheduling</h2>
      
      {/* --- TAB BAR BARU --- */}
      <div className="flex border-b mb-4">
        <button onClick={() => setActiveTab('reguler')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'reguler' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
            Reguler ({schedulableBacklogs.length})
        </button>
        <button onClick={() => setActiveTab('shutdown')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'shutdown' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
            Butuh Shutdown ({shutdownBacklogs.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <p>Tidak ada backlog yang siap untuk dijadwalkan di tab ini.</p>
      ) : (
        <div className="space-y-3">
          {currentList.map((backlog) => (
            <div key={backlog.id} className="border p-4 rounded-lg shadow-sm bg-white flex justify-between items-center">
              <div>
                <p className="font-semibold">{backlog.registration_code} - {backlog.unit_code}</p>
                <p className="text-sm text-gray-600">{backlog.problem}</p>

                <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
    backlog.priority === 'High' ? 'bg-red-600' :
    backlog.priority === 'Medium' ? 'bg-yellow-500' :
    backlog.priority === 'Low' ? 'bg-blue-500' : 'bg-gray-500'
}`}>
    {backlog.priority || 'Low'}
    </span>
                
                <p className="text-xs text-gray-400">Tanggal Lapor: {new Date(backlog.date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => openSchedulingModal(backlog)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Jadwalkan</button>
            </div>
          ))}
        </div>
      )}

      {selectedBacklog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">Jadwalkan: {selectedBacklog.registration_code}</h3>
            {/* --- DROPDOWN SHUTDOWN KONDISIONAL --- */}
            {activeTab === 'shutdown' && (
                <div>
                    <label className="block text-sm font-medium mb-1">Tautkan ke Event Shutdown</label>
                    <Select
                        options={shutdownEvents}
                        value={selectedShutdown}
                        onChange={(opt) => setSelectedShutdown(opt as any)}
                        placeholder="Pilih event shutdown..."
                    />
                </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Eksekusi</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tugaskan Mekanik</label>
              <Select isMulti options={mechanicOptions} value={assignedMechanics} onChange={(opts) => setAssignedMechanics(opts as any)} placeholder="Pilih satu atau lebih mekanik..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catatan Eksekusi (Opsional)</label>
              <textarea value={executionNotes} onChange={e => setExecutionNotes(e.target.value)} className="w-full border rounded px-3 py-2" rows={3}></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedBacklog(null)} className="border rounded px-4 py-2 hover:bg-gray-100" disabled={isSaving}>Batal</button>
              <button onClick={handleScheduleSubmit} className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 disabled:opacity-50" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklogScheduling;
