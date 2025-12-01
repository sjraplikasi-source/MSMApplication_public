import { useEffect, useState } from 'react';
import { Report } from '../types';
import { supabase } from '@/lib/supabase';

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase.from('reports').select('*');
      if (!error && data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  return { reports, loading };
};
