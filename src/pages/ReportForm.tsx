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

  // ✅ HM STATES
  const [lastHM, setLastHM] = useState<number | null>(null);
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
    submitted_by: user?.id || '',
    activity_id: '',
    activity_type_id: '',
    status: 'submitted'
  };

  // ==============================
  // FETCH LAST HM
  // ==============================
  const fetchLastHM = async (equipmentId: string) => {
    const { data } = await supabase
      .from("hour_meter_readings")
      .select("hours, reading_date")
      .eq("equipment_id", equipmentId)
      .order("reading_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setLastHM(Number(data.hours));
    else setLastHM(null);
  };

  useEffect(() => {
    if (form.equipment_id) fetchLastHM(form.equipment_id);
  }, [form.equipment_id]);

  // ==============================
  // HM VALIDATION
  // ==============================
  useEffect(() => {

    if (!form.hour_meter || lastHM === null) {
      setHmWarning(null);
      setHmDelta(null);
      return;
    }

    const hmValue = Number(form.hour_meter);
    if (isNaN(hmValue)) return;

    const delta = hmValue - lastHM;
    setHmDelta(delta);

    if (hmValue < lastHM) {
      setHmWarning("HM lebih kecil dari reading terakhir");
      return;
    }

    if (delta > 24) {
      setHmWarning(`Delta HM (${delta} jam) melebihi batas 24 jam`);
      return;
    }

    setHmWarning(null);

  }, [form.hour_meter, lastHM]);

  const isHMValid = !hmWarning;

  // ==============================
  // HANDLE CHANGE
  // ==============================
  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isHMValid) {
      setError("Periksa nilai Hour Meter");
      return;
    }

    setLoading(true);
    setError(null);

    const { manpower_ids, ...payload } = form;

    const cleanedPayload = {
      ...Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
      )
    };

    let reportId;

    if (isEdit && id) {
      const { error } = await supabase
        .from('repair_reports')
        .update(cleanedPayload)
        .eq('id', id);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      reportId = id;

    } else {
      const { data, error } = await supabase
        .from('repair_reports')
        .insert([cleanedPayload])
        .select()
        .single();

      if (error || !data) {
        setError(error?.message || "Gagal simpan report");
        setLoading(false);
        return;
      }

      reportId = data.id;
    }

    // ==============================
    // UPSERT HM
    // ==============================
    if (form.hour_meter) {
      const hmValue = Number(form.hour_meter);

      const { error: hmError } = await supabase
        .from("hour_meter_readings")
        .upsert([
          {
            equipment_id: form.equipment_id,
            reading_date: form.start_date,
            hours: hmValue,
          }
        ], {
          onConflict: "equipment_id,reading_date"
        });

      if (hmError) {
        console.warn("HM rejected:", hmError.message);
      }
    }

    setLoading(false);
    navigate('/reports');
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">

      <h2 className="text-xl font-bold mb-4">Add Report Activity</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

        <div>
          <label>Equipment</label>
          <input
            className="border w-full"
            value={form.equipment_id || ''}
            onChange={(e) => handleChange("equipment_id", e.target.value)}
          />
        </div>

        <div>
          <label>Hour Meter</label>
          <input
            type="number"
            className="border w-full"
            value={form.hour_meter || ''}
            onChange={(e) => handleChange("hour_meter", e.target.value)}
          />

          {lastHM !== null && (
            <div className="text-sm text-gray-500">
              Last HM : {lastHM.toLocaleString()}
            </div>
          )}

          {hmDelta !== null && (
            <div className="text-sm">
              Delta : {hmDelta} jam
            </div>
          )}

          {hmWarning && (
            <div className="text-sm text-red-500 font-medium">
              🚨 {hmWarning}
            </div>
          )}
        </div>

        {error && (
          <div className="col-span-2 text-red-500">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isHMValid || loading}
          className="col-span-2 bg-blue-600 text-white py-2 rounded"
        >
          Submit
        </button>

      </form>
    </div>
  );
};

export default ReportForm;