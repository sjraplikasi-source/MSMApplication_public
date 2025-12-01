// src/hooks/useReportData.ts
import { useState, useEffect, useCallback } from 'react';
import { Report } from '../types';
import { supabase } from '@/lib/supabase';

export const useReportData = (filters?: Partial<Report>) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('repair_reports').select(`
        id, wo_number, area, shift, status, created_at,
        equipment (name)
      `);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else if (data) {
      setReports(data as Report[]);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  };
};
