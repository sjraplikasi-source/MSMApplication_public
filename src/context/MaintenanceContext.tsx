// ================================
// src/context/MaintenanceContext.tsx
// ================================

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface MaintenanceContextType {
  refreshKey: number;
  refreshData: () => void;
  maintenanceRecords: any[];
  setMaintenanceRecords: React.Dispatch<React.SetStateAction<any[]>>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);

  const refreshData = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    // Ambil data maintenance dari Supabase setiap kali refreshKey berubah
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .order("date", { ascending: false });
      if (error) console.error("Gagal memuat maintenance records:", error);
      else setMaintenanceRecords(data || []);
    };
    fetchData();
  }, [refreshKey]);

  return (
    <MaintenanceContext.Provider
      value={{ refreshKey, refreshData, maintenanceRecords, setMaintenanceRecords }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenanceContext = (): MaintenanceContextType => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenanceContext harus digunakan di dalam MaintenanceProvider");
  }
  return context;
};
