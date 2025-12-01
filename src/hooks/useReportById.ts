// src/hooks/useReportById.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useReportById = (id: string) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('repair_reports')
        .select(`
          *,
          area:area_id (id, name),
          equipment:equipment_id (id, name, code),
          failure:failure_id (id, name),
          diagnosis:diagnosis_id (id, name),
          action:action_id (id, name),
          instruction:instruction_id (id, name),
          reason:reason_id (id, name),
          sub_component:sub_component_id (id, name),
          finding:finding_id (id, name),
          problems:problems_id (id, name),
          activity:activity_id (id, name),
          activity_type:activity_type_id (id, name),
          repair_reports_manpower ( manpower (id, name) )
        `)
        .eq('id', id)
        .single();

      if (error) setError(error.message);
      else setReport(data);

      setLoading(false);
    };

    if (id) fetchReport();
  }, [id]);

  return { report, loading, error };
};
