// src/pages/Backlog/BacklogForm.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Select from 'react-select';
import { useAuth } from '@/context/AuthContext';

const STATUS = {
  DRAFT: 'draft',
  VALIDATED: 'validated',
  REVIEWED: 'reviewed',
  REJECTED: 'rejected',
} as const;

type SpareRow = { part_number: string; part_name: string; qty: number; remarks: string };
type ToolRow = { tool_name: string; specification: string; qty: number; remarks: string };
type ManRow = { skill_required: string; qty: number; remarks: string };

export default function BacklogForm() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [problem, setProblem] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [equipmentOptions, setEquipmentOptions] = useState<any[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<any>({ value: 'Low', label: 'Low - Normal (Unit bisa bertahan > 1 bulan)' });

  const [needSparepart, setNeedSparepart] = useState(false);
  const [needTools, setNeedTools] = useState(false);
  const [needManpower, setNeedManpower] = useState(false);
  const [needShutdown, setNeedShutdown] = useState(false);
  const [shutdownRequired, setShutdownRequired] = useState('');

  const [spareparts, setSpareparts] = useState<SpareRow[]>([{ part_number: '', part_name: '', qty: 1, remarks: '' }]);
  const [tools, setTools] = useState<ToolRow[]>([{ tool_name: '', specification: '', qty: 1, remarks: '' }]);
  const [manpower, setManpower] = useState<ManRow[]>([{ skill_required: '', qty: 1, remarks: '' }]);

  const [registrationCode, setRegistrationCode] = useState('');
  const [usedCodes, setUsedCodes] = useState(new Set<string>());
    // --- STATE BARU UNTUK CEK DUPLIKAT ---
  const [existingBacklogs, setExistingBacklogs] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // --- AKHIR STATE BARU ---
// --- useEffect BARU UNTUK MENGAMBIL BACKLOG YANG ADA ---
  
useEffect(() => {
  const fetchExistingBacklogs = async () => {
    if (!selectedEquipment?.value) {
      setExistingBacklogs([]);
      return;
    }

    setIsLoadingSuggestions(true);
    const { data, error } = await supabase
      .from('backlogs')
      .select('id, problem, registration_code, status')
      .eq('unit_code', selectedEquipment.value)
      .not('status', 'in', '("closed", "rejected")'); // Hanya ambil yang masih terbuka

    if (error) {
      console.error("Gagal mengambil backlog yang ada:", error);
      setExistingBacklogs([]);
    } else {
      setExistingBacklogs(data || []);
    }
    setIsLoadingSuggestions(false);
  };

  fetchExistingBacklogs();
}, [selectedEquipment]); // Dijalankan setiap kali unit berubah

  // --- useEffect BARU UNTUK MENAMPILKAN SARAN ---
useEffect(() => {
  if (!problem.trim() || existingBacklogs.length === 0) {
    setSuggestions([]);
    return;
  }

  const searchTerms = problem.toLowerCase().split(' ').filter(term => term.length > 2);
  if (searchTerms.length === 0) {
    setSuggestions([]);
    return;
  }

  const filtered = existingBacklogs.filter(bl => {
    const problemText = bl.problem.toLowerCase();
    return searchTerms.some(term => problemText.includes(term));
  });

  setSuggestions(filtered);
}, [problem, existingBacklogs]); // Dijalankan setiap kali problem atau daftar backlog berubah
  
  useEffect(() => {
    generateNewCode();
  }, []);

  const generateNewCode = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase.rpc('generate_backlog_registration_code');
      if (data && !usedCodes.has(data)) {
        setRegistrationCode(data);
        return;
      }
    }
    alert('Gagal menghasilkan kode registrasi unik. Silakan coba lagi.');
  };

useEffect(() => {
    const fetchEquipment = async () => {
      // 1. Ambil kolom "name" juga dari tabel equipment
      const { data } = await supabase.from('equipment').select('id, code, name');
      
      const options = (data || []).map((e: any) => ({ 
        value: e.code, 
        // 2. Gabungkan code dan name untuk label yang lebih informatif
        label: `${e.code} — ${e.name}` 
      }));

      setEquipmentOptions(options);
    };
    fetchEquipment();
}, []);

  const resetForm = async () => {
    setSelectedEquipment(null);
    setDate('');
    setProblem('');
    setSelectedPriority({ value: 'Low', label: 'Low - Normal (Unit bisa bertahan > 1 bulan)' });
    setNeedSparepart(false);
    setNeedTools(false);
    setNeedManpower(false);
    setNeedShutdown(false);
    setShutdownRequired('');
    setSpareparts([{ part_number: '', part_name: '', qty: 1, remarks: '' }]);
    setTools([{ tool_name: '', specification: '', qty: 1, remarks: '' }]);
    setManpower([{ skill_required: '', qty: 1, remarks: '' }]);
    await generateNewCode();
  };

  const handleSubmit = async () => {
    if (!selectedEquipment?.value || !date || !problem.trim()) {
      alert('Unit, tanggal, dan problem wajib diisi.');
      return;
    }

    // Guard kode unik
    const { data: existing } = await supabase
      .from('backlogs')
      .select('id')
      .eq('registration_code', registrationCode)
      .maybeSingle();
    if (existing) {
      setUsedCodes(prev => new Set(prev).add(registrationCode));
      await generateNewCode();
      return;
    }

    const { data: backlog, error } = await supabase
      .from('backlogs')
.insert({
  unit_code: selectedEquipment?.value || '',
  date,
  problem,
  need_sparepart: needSparepart,
  need_tools: needTools,
  need_manpower: needManpower,
  need_shutdown: needShutdown,
  shutdown_required: needShutdown ? shutdownRequired === 'yes' : null,
  registration_code: registrationCode,
  priority: selectedPriority?.value || 'Low',
  status: STATUS.DRAFT,
  created_by: user?.id || null, // <-- TAMBAHKAN BARIS INI
})
      .select()
      .single();

    if (error) {
      console.error('Gagal simpan backlog', error);
      alert('Gagal menyimpan backlog.');
      return;
    }

    const backlogId = (backlog as any).id;

    if (needSparepart) {
      for (const item of spareparts) {
        await supabase.from('backlog_spareparts').insert({ backlog_id: backlogId, ...item });
      }
    }
    if (needTools) {
      for (const item of tools) {
        await supabase.from('backlog_tools').insert({ backlog_id: backlogId, ...item });
      }
    }
    if (needManpower) {
      for (const item of manpower) {
        await supabase.from('backlog_manpower').insert({ backlog_id: backlogId, ...item });
      }
    }

    resetForm();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Form Input Backlog</h1>
      <div>
        <Label>Registration Code</Label>
        <Input value={registrationCode} readOnly />
      </div>
      <div>
        <Label>Unit Code</Label>
        <Select options={equipmentOptions} value={selectedEquipment} onChange={setSelectedEquipment} />
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
<div>
  <Label>Problem</Label>
  <Textarea value={problem} onChange={e => setProblem(e.target.value)} />

  {/* --- FIELD BARU UNTUK PRIORITAS --- */}
      <div>
        <Label>Priority</Label>
        <Select 
          options={[
    { value: 'High', label: 'High - Kritis (Unit bisa breakdown < 1 minggu)' },
    { value: 'Medium', label: 'Medium - Tinggi (Unit bisa breakdown < 1 bulan)' },
    { value: 'Low', label: 'Low - Normal (Unit bisa bertahan > 1 bulan)' },
    { value: 'Improve', label: 'Improve - Improvement (Modifikasi/Project)' },
          ]} 
          value={selectedPriority} 
          onChange={setSelectedPriority} 
        />
      </div>
  
  {/* --- KOTAK SARAN BARU --- */}
  {isLoadingSuggestions && (
    <div className="mt-2 text-sm text-gray-500">Mencari backlog serupa...</div>
  )}
  {suggestions.length > 0 && (
    <div className="mt-2 border rounded-lg bg-amber-50 p-3">
      <h4 className="font-semibold text-sm text-amber-800">Peringatan: Ditemukan backlog serupa yang masih terbuka</h4>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        {suggestions.map(bl => (
          <li key={bl.id} className="text-sm">
            <a 
              href={`/Backlog/detail/${bl.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {bl.registration_code}: <span className="text-gray-800">{bl.problem}</span>
            </a>
            <span className="ml-2 text-xs font-medium bg-white px-1.5 py-0.5 rounded border">{bl.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )}
  {/* --- AKHIR KOTAK SARAN --- */}
</div>

      <div className="space-y-1">
        <Label>Supporting Requirements</Label>

        {/* Sparepart */}
        <div className="flex items-center space-x-2">
          <Checkbox id="sparepart" checked={needSparepart} onCheckedChange={(v) => setNeedSparepart(!!v)} />
          <Label htmlFor="sparepart">Butuh Sparepart</Label>
        </div>
        {needSparepart && (
          <div className="space-y-2 ml-4">
            {spareparts.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <Input placeholder="Part Number" value={item.part_number}
                  onChange={(e) => { const u=[...spareparts]; u[index].part_number=e.target.value; setSpareparts(u); }}/>
                <Input placeholder="Part Name" value={item.part_name}
                  onChange={(e) => { const u=[...spareparts]; u[index].part_name=e.target.value; setSpareparts(u); }}/>
                <Input placeholder="Qty" type="number" value={item.qty}
                  onChange={(e) => { const u=[...spareparts]; u[index].qty=Number(e.target.value); setSpareparts(u); }}/>
                <Input placeholder="Remarks" value={item.remarks}
                  onChange={(e) => { const u=[...spareparts]; u[index].remarks=e.target.value; setSpareparts(u); }}/>
              </div>
            ))}
            <Button type="button" onClick={() => setSpareparts([...spareparts, { part_number: '', part_name: '', qty: 1, remarks: '' }])}>
              + Tambah Sparepart
            </Button>
          </div>
        )}

        {/* Tools */}
        <div className="flex items-center space-x-2">
          <Checkbox id="tools" checked={needTools} onCheckedChange={(v) => setNeedTools(!!v)} />
          <Label htmlFor="tools">Butuh Special Tools/ Alat Support</Label>
        </div>
        {needTools && (
          <div className="space-y-2 ml-4">
            {tools.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <Input placeholder="Tool Name" value={item.tool_name}
                  onChange={(e) => { const u=[...tools]; u[index].tool_name=e.target.value; setTools(u); }}/>
                <Input placeholder="Specification" value={item.specification}
                  onChange={(e) => { const u=[...tools]; u[index].specification=e.target.value; setTools(u); }}/>
                <Input placeholder="Qty" type="number" value={item.qty}
                  onChange={(e) => { const u=[...tools]; u[index].qty=Number(e.target.value); setTools(u); }}/>
                <Input placeholder="Remarks" value={item.remarks}
                  onChange={(e) => { const u=[...tools]; u[index].remarks=e.target.value; setTools(u); }}/>
              </div>
            ))}
            <Button type="button" onClick={() => setTools([...tools, { tool_name: '', specification: '', qty: 1, remarks: '' }])}>
              + Tambah Tools
            </Button>
          </div>
        )}

        {/* Manpower */}
        <div className="flex items-center space-x-2">
          <Checkbox id="manpower" checked={needManpower} onCheckedChange={(v) => setNeedManpower(!!v)} />
          <Label htmlFor="manpower">Butuh Manpower</Label>
        </div>
        {needManpower && (
          <div className="space-y-2 ml-4">
            {manpower.map((item, index) => (
              <div key={index} className="grid grid-cols-3 gap-2">
                <Input placeholder="Skill Required" value={item.skill_required}
                  onChange={(e) => { const u=[...manpower]; u[index].skill_required=e.target.value; setManpower(u); }}/>
                <Input placeholder="Qty" type="number" value={item.qty}
                  onChange={(e) => { const u=[...manpower]; u[index].qty=Number(e.target.value); setManpower(u); }}/>
                <Input placeholder="Remarks" value={item.remarks}
                  onChange={(e) => { const u=[...manpower]; u[index].remarks=e.target.value; setManpower(u); }}/>
              </div>
            ))}
            <Button type="button" onClick={() => setManpower([...manpower, { skill_required: '', qty: 1, remarks: '' }])}>
              + Tambah Manpower
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox id="shutdown" checked={needShutdown} onCheckedChange={(v) => setNeedShutdown(!!v)} />
          <Label htmlFor="shutdown">Butuh Shutdown</Label>
        </div>
      </div>

      {needShutdown && (
        <div>
          <Label>Shutdown Required?</Label>
          <select className="w-full border rounded px-3 py-2" value={shutdownRequired} onChange={e => setShutdownRequired(e.target.value)}>
            <option value="">Pilih</option>
            <option value="yes">Ya</option>
            <option value="no">Tidak</option>
          </select>
        </div>
      )}

      <Button onClick={handleSubmit}>Simpan Backlog</Button>
    </div>
  );
}
