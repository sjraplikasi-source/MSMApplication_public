import React from "react";
import { Routes, Route } from "react-router-dom";
import { MaintenanceProvider } from "@/context/MaintenanceContext";

const Dashboard = React.lazy(() => import("./Dashboard"));
const Equipment = React.lazy(() => import("./Equipment"));
const EquipmentDetail = React.lazy(() => import("./EquipmentDetail"));
const Components = React.lazy(() => import("./Components"));
const HourMeter = React.lazy(() => import("./HourMeter"));
const WeeklyCheck = React.lazy(() => import("./WeeklyCheck"));
const Schedule = React.lazy(() => import("./MaintenanceSchedule"));
const Records = React.lazy(() => import("./MaintenanceRecords"));
const Settings = React.lazy(() => import("./MaintenanceSettings"));
const Planning = React.lazy(() => import("./MaintenancePlanning"));

export default function MineRouter() {
  return (
    <MaintenanceProvider>
      <React.Suspense fallback={<div>Loading Mine Maintenance...</div>}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          <Route path="components" element={<Components />} />
          <Route path="hour-meter" element={<HourMeter />} />
          <Route path="weekly-check" element={<WeeklyCheck />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="records" element={<Records />} />
          <Route path="planning" element={<Planning />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </React.Suspense>
    </MaintenanceProvider>
  );
}
