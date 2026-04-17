// =============================
// src/pages/ReportForm.tsx
// =============================

import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';

const ReportForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<any>({});
  const [masters, setMasters] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastHM, setLastHM] = useState<number | null>(null);
  const [lastHMDate, setLastHMDate] = useState<string | null>(null);
  const [hmWarning, setHmWarning] = useState<string | null>(null);
  const [hmDelta, setHmDelta] = useState<number | null>(null);

  const emptyForm = {
    wo_number: '',
    equipment_id: '',
    problems_id: '',
    start_date: '',
    start_hour: '',
    finish_date: '',
    finish_hour: '',
    shift: 'Shift 1',
    hour_meter: '',
    approved_name: '',
    approved_by_id: '',
    approved_by: null,
    manpower_ids: [],
    failure_id: '',
    diagnosis_id: '',
    reason_id: '',
    finding_id: '',
    area_id: '',
    action_id: '',
    instruction_id: '',
    sub_component_id: '',
    problem_description: '',
    part_number: '',
    part_causing_failure: '',
    mechanic_comment: '',
    status_breakdown: 'Schedule',
    activity_status: 'RFU',
    submitted_by: '',
    activity_id: '',
    activity_type_id: '',
    status: 'submitted'
  };

  const validateHMValue = (
    hmValueRaw: any,
    referenceHM: number | null,
    referenceDate: string | null,
    currentDate: string
  ) => {
    if (hmValueRaw === '' || hmValueRaw === null || hmValueRaw === undefined) {
      return null;
    }

    const hmValue = Number(hmValueRaw);
    if (isNaN(hmValue)) {
      return 'Hour Meter tidak valid';
    }

    if (referenceHM === null || !referenceDate || !currentDate) {
      return null;
    }

    if (hmValue < referenceHM) {
      return 'HM lebih kecil dari reading sebelumnya';
    }

    const delta = hmValue - referenceHM;
    const lastDateValue = new Date(referenceDate);
    const currentDateValue = new Date(currentDate);
    const diffTime = currentDateValue.getTime() - lastDateValue.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const effectiveDays = diffDays <= 0 ? 1 : diffDays;
    const maxAllowedDelta = effectiveDays * 24;

    if (delta > maxAllowedDelta) {
      return `Delta HM (${delta} jam) melebihi batas wajar (${maxAllowedDelta.toFixed(1)} jam untuk ${effectiveDays.toFixed(1)} hari)`;
    }

    return null;
  };

  useEffect(() => {
    const fetchAndSet = async () => {
      if (isEdit && id) {
        const { data } = await supabase
          .from('repair_reports')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          const { data: manpower } = await supabase
            .from('repair_reports_manpower')
            .select('manpower_id')
            .eq('report_id', id);

          setForm({
            ...data,
            manpower_ids: (manpower || []).map((m: any) => m.manpower_id)
          });
        } else {
          setForm({ ...emptyForm, submitted_by: user?.id || '' });
        }
      } else {
        const saved = localStorage.getItem('unsavedReportForm');
        if (saved) {
          setForm(JSON.parse(saved));
        } else {
          setForm({ ...emptyForm, submitted_by: user?.id || '' });
        }
      }
    };

    fetchAndSet();
  }, [user, isEdit, id]);

  useEffect(() => {
    const loadMasters = async () => {
      const tables = [
        'equipment', 'failure', 'diagnosis', 'action', 'instruction', 'reason', 'sub_component',
        'finding', 'problems', 'activities', 'activity_type', 'area', 'manpower'
      ];
      const result: any = {};

      const fetchTable = async (table: string) => {
        try {
          const columns = table === 'equipment' ? 'id, name, code' : 'id, name';
          const { data } = await supabase.from(table).select(columns);
          return data || [];
        } catch {
          console.warn(`Gagal load ${table}`);
          return [];
        }
      };

      for (const table of tables) {
        result[table] = await fetchTable(table);
      }

      const { data: leaders } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'group_leader');
      result['group_leaders'] = leaders || [];

      result['status_breakdown'] = [
        { id: 'Schedule', name: 'Schedule' },
        { id: 'Unschedule', name: 'Unschedule' }
      ];

      result['activity_status'] = [
        { id: 'RFU', name: 'RFU' },
        { id: 'Pending Job', name: 'Pending Job' }
      ];

      result['shift_enum'] = [
        { id: 'Shift 1', name: 'Shift 1' },
        { id: 'Shift 2', name: 'Shift 2' }
      ];

      setMasters(result);
    };

    loadMasters();
  }, [user]);

  const fetchLastHM = async (equipmentId: string, selectedDate?: string) => {
    if (!equipmentId) {
      setLastHM(null);
      setLastHMDate(null);
      return;
    }

    let query = supabase
      .from('hour_meter_readings')
      .select('hours, reading_date')
      .eq('equipment_id', equipmentId);

    if (selectedDate) {
      query = query.lte('reading_date', selectedDate);
    }

    const { data } = await query
      .order('reading_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLastHM(Number(data.hours));
      setLastHMDate(data.reading_date);
    } else {
      setLastHM(null);
      setLastHMDate(null);
    }
  };

  useEffect(() => {
    if (form.equipment_id && form.start_date) {
      fetchLastHM(form.equipment_id, form.start_date);
    }
  }, [form.equipment_id, form.start_date]);

  useEffect(() => {
    if (!form.hour_meter || lastHM === null || !lastHMDate || !form.start_date) {
      setHmWarning(null);
      setHmDelta(null);
      return;
    }

    const hmValue = Number(form.hour_meter);
    if (isNaN(hmValue)) return;

    const delta = hmValue - lastHM;
    setHmDelta(delta);
    setHmWarning(validateHMValue(form.hour_meter, lastHM, lastHMDate, form.start_date));
  }, [form.hour_meter, form.start_date, lastHM, lastHMDate]);

  const handleChange = (field: string, value: any) => {
    setForm((prevForm: any) => {
      const updatedForm = { ...prevForm, [field]: value };

      if (
        updatedForm.start_date &&
        updatedForm.start_hour &&
        updatedForm.finish_date &&
        updatedForm.finish_hour
      ) {
        const start = new Date(`${updatedForm.start_date}T${updatedForm.start_hour}`);
        const finish = new Date(`${updatedForm.finish_date}T${updatedForm.finish_hour}`);
        const diff = (finish.getTime() - start.getTime()) / 1000 / 3600;
        updatedForm.duration = diff >= 0 ? parseFloat(diff.toFixed(2)) : '';
      }

      if (!isEdit) {
        localStorage.setItem('unsavedReportForm', JSON.stringify(updatedForm));
      }

      return updatedForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isHMValid) {
      setError(hmWarning || 'Periksa nilai Hour Meter');
      return;
    }

    setLoading(true);
    setError(null);

    const { manpower_ids, ...payload } = form;
    const cleanedPayload = {
      ...Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
      ),
      status: form.status || 'submitted'
    };

    let dataRes;
    let errorRes;
    let createdReportId: string | null = null;

    try {
      if (form.hour_meter && form.equipment_id && form.start_date) {
        const { data: latestHM, error: latestHMError } = await supabase
          .from('hour_meter_readings')
          .select('hours, reading_date')
          .eq('equipment_id', form.equipment_id)
          .lte('reading_date', form.start_date)
          .order('reading_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestHMError) {
          throw new Error(`Gagal memvalidasi Hour Meter: ${latestHMError.message}`);
        }

        const latestHMValue = latestHM ? Number(latestHM.hours) : null;
        const latestHMDate = latestHM?.reading_date || null;
        const hmValidationError = validateHMValue(form.hour_meter, latestHMValue, latestHMDate, form.start_date);

        if (hmValidationError) {
          setLastHM(latestHMValue);
          setLastHMDate(latestHMDate);
          setHmWarning(hmValidationError);
          throw new Error(hmValidationError);
        }
      }

      if (isEdit && id) {
        const { error } = await supabase
          .from('repair_reports')
          .update(cleanedPayload)
          .eq('id', id);

        errorRes = error;
        dataRes = { id };

        if (!error) {
          await updateManpowerRelation(id, manpower_ids);
        }
      } else {
        const { data, error } = await supabase
          .from('repair_reports')
          .insert([cleanedPayload])
          .select();
        dataRes = data && data[0];
        errorRes = error;

        if (!error && dataRes) {
          createdReportId = dataRes.id;
          await updateManpowerRelation(dataRes.id, manpower_ids);
        }
      }

      if (errorRes || !dataRes) {
        throw new Error(errorRes?.message || 'Gagal menyimpan laporan');
      }

      if (form.hour_meter && form.equipment_id && form.start_date) {
        const hmValue = Number(form.hour_meter);

        const { error: hmError } = await supabase
          .from('hour_meter_readings')
          .upsert([
            {
              equipment_id: form.equipment_id,
              reading_date: form.start_date,
              hours: hmValue,
            }
          ], {
            onConflict: 'equipment_id,reading_date'
          });

        if (hmError) {
          throw new Error(`Gagal menyimpan Hour Meter: ${hmError.message}`);
        }
      }

      if (!isEdit) localStorage.removeItem('unsavedReportForm');

      navigate('/reports');
    } catch (submitError: any) {
      if (!isEdit && createdReportId) {
        await supabase
          .from('repair_reports_manpower')
          .delete()
          .eq('report_id', createdReportId);

        await supabase
          .from('repair_reports')
          .delete()
          .eq('id', createdReportId);
      }

      setError(submitError?.message || 'Gagal menyimpan laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndValidate = async () => {
    if (!isEdit || !id || !user) return;
    if (!window.confirm('Apakah data sudah benar? Laporan akan disetujui (Approved).')) return;

    setLoading(true);
    setError(null);

    const { manpower_ids, ...payload } = form;

    const cleanedPayload = {
      ...Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
      ),
      status: 'approved',
      approved_by: user.id,
      approved_by_id: user.id,
      approved_name: user?.name || user?.email
    };

    const { error } = await supabase
      .from('repair_reports')
      .update(cleanedPayload)
      .eq('id', id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await updateManpowerRelation(id, manpower_ids);

    setLoading(false);
    navigate('/validasi');
  };

  const updateManpowerRelation = async (reportId: string, manpowerIds: any[]) => {
    const { error: deleteError } = await supabase
      .from('repair_reports_manpower')
      .delete()
      .eq('report_id', reportId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (manpowerIds && manpowerIds.length) {
      const inserts = manpowerIds.map((mid: string) => ({
        report_id: reportId,
        manpower_id: mid,
      }));
      const { error: insertError } = await supabase.from('repair_reports_manpower').insert(inserts);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  };

  const isHMValid = !hmWarning;

  const renderSearchSelect = (label: string, field: string, source: string, showCode = false) => {
    const options = (masters[source] || []).map((item: any) => ({
      value: item.id,
      label: showCode && item.code ? `${item.code} - ${item.name}` : item.name
    }));

    return (
      <div className="w-full">
        <label className="block text-sm mb-1">{label}</label>
        <Select
          options={options}
          value={options.find((o: any) => o.value === form[field]) || null}
          onChange={(selected: any) => handleChange(field, selected?.value || '')}
          isClearable
          isSearchable
          menuPortalTarget={document.body}
          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
        />
      </div>
    );
  };

  const renderMultiSelect = (label: string, field: string, source: string) => {
    const options = (masters[source] || []).map((item: any) => ({ value: item.id, label: item.name }));
    const selectedValues = options.filter((opt: any) => form[field]?.includes(opt.value));

    return (
      <div className="w-full sm:col-span-2">
        <label className="block text-sm mb-1">{label}</label>
        <Select
          isMulti
          options={options}
          value={selectedValues}
          onChange={(selected: any) => handleChange(field, selected.map((s: any) => s.value))}
          placeholder="Pilih..."
          menuPortalTarget={document.body}
          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
        />
      </div>
    );
  };

  return (
    <div className="p-4 max-w-3xl mx-auto mb-20">
      <Link to="/reports" className="text-blue-600 text-sm block mb-2">&larr; Kembali</Link>
      <h2 className="text-xl font-bold mb-4">{isEdit ? 'Edit Laporan Breakdown' : 'Add Report Activity'}</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="w-full">
          <label className="block text-sm mb-1">WO Number</label>
          <input type="text" className="border px-3 py-2 w-full rounded" value={form.wo_number} onChange={(e) => handleChange('wo_number', e.target.value)} />
        </div>
        {renderSearchSelect('Equipment', 'equipment_id', 'equipment', true)}

        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Problem Description</label>
          <textarea className="border px-3 py-2 w-full rounded" rows={2} value={form.problem_description} onChange={(e) => handleChange('problem_description', e.target.value)} />
        </div>

        <div className="w-full">
          <label className="block text-sm mb-1">Part Causing Failure</label>
          <input type="text" className="border px-3 py-2 w-full rounded" value={form.part_causing_failure} onChange={(e) => handleChange('part_causing_failure', e.target.value)} />
        </div>
        <div className="w-full">
          <label className="block text-sm mb-1">Part Number</label>
          <input type="text" className="border px-3 py-2 w-full rounded" value={form.part_number} onChange={(e) => handleChange('part_number', e.target.value)} />
        </div>

        <div className="w-full">
          <label className="block text-sm mb-1">Start Date</label>
          <input type="date" className="border px-3 py-2 w-full rounded" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
        </div>
        <div className="w-full">
          <label className="block text-sm mb-1">Start Hour</label>
          <input type="time" className="border px-3 py-2 w-full rounded" value={form.start_hour} onChange={(e) => handleChange('start_hour', e.target.value)} />
        </div>
        <div className="w-full">
          <label className="block text-sm mb-1">Finish Date</label>
          <input type="date" className="border px-3 py-2 w-full rounded" value={form.finish_date} onChange={(e) => handleChange('finish_date', e.target.value)} />
        </div>
        <div className="w-full">
          <label className="block text-sm mb-1">Finish Hour</label>
          <input type="time" className="border px-3 py-2 w-full rounded" value={form.finish_hour} onChange={(e) => handleChange('finish_hour', e.target.value)} />
        </div>

        <div className="w-full">
          <label className="block text-sm mb-1">Hour Meter</label>
          <input type="number" className="border px-3 py-2 w-full rounded" value={form.hour_meter} onChange={(e) => handleChange('hour_meter', e.target.value)} placeholder="Angka..." />
          {lastHM !== null && (
            <div className="text-xs text-gray-500 mt-1">
              Last HM : {lastHM.toLocaleString()}
            </div>
          )}

          {lastHMDate && (
            <div className="text-xs text-gray-500">
              Last Date : {lastHMDate}
            </div>
          )}

          {hmDelta !== null && (
            <div className="text-xs text-gray-600">
              Delta : {hmDelta} jam
            </div>
          )}

          {hmWarning && (
            <div className="text-xs text-red-500 font-medium">
              🚨 {hmWarning}
            </div>
          )}
        </div>
        {renderSearchSelect('Shift', 'shift', 'shift_enum')}

        {renderSearchSelect('Group Leader', 'approved_by_id', 'group_leaders')}
        {renderMultiSelect('Manpower', 'manpower_ids', 'manpower')}

        {renderSearchSelect('Failure', 'failure_id', 'failure')}
        {renderSearchSelect('Diagnosis', 'diagnosis_id', 'diagnosis')}
        {renderSearchSelect('Reason', 'reason_id', 'reason')}
        {renderSearchSelect('Finding', 'finding_id', 'finding')}
        {renderSearchSelect('Area', 'area_id', 'area')}
        {renderSearchSelect('Action', 'action_id', 'action')}
        {renderSearchSelect('Instruction', 'instruction_id', 'instruction')}
        {renderSearchSelect('Sub Component', 'sub_component_id', 'sub_component')}
        {renderSearchSelect('Problem', 'problems_id', 'problems')}
        {renderSearchSelect('Activity', 'activity_id', 'activities')}
        {renderSearchSelect('Activity Type', 'activity_type_id', 'activity_type')}

        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Komentar Mekanik</label>
          <textarea className="border px-3 py-2 w-full rounded" rows={2} value={form.mechanic_comment} onChange={(e) => handleChange('mechanic_comment', e.target.value)} />
        </div>

        {renderSearchSelect('Status Breakdown', 'status_breakdown', 'status_breakdown')}
        {renderSearchSelect('Activity Status', 'activity_status', 'activity_status')}

        {error && <p className="text-red-600 text-sm sm:col-span-2 text-center bg-red-50 p-2 rounded">{error}</p>}

        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded transition-colors"
            disabled={loading || !isHMValid}
          >
            {loading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Submit Laporan Baru')}
          </button>

          {isEdit && !form.approved_by && (
            <button
              type="button"
              onClick={handleSaveAndValidate}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded transition-colors flex justify-center items-center gap-2"
              disabled={loading}
            >
              {loading ? 'Memproses...' : (
                <>
                  <span>Simpan & Setujui</span>
                  <span className="text-xs bg-green-800 px-2 py-0.5 rounded text-green-100 uppercase font-bold">Validate</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReportForm;
