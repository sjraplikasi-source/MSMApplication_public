import React from "react";
import { Routes, Route } from "react-router-dom";

const Dashboard = React.lazy(() => import("./MaintenancePlanning")); // gunakan dashboard dari planning
const Equipment = React.lazy(() => import("./Equipment"));
const EquipmentDetail = React.lazy(() => import("./EquipmentDetail"));
const Components = React.lazy(() => import("./Components"));
const HourMeter = React.lazy(() => import("./HourMeter"));
const WeeklyCheck = React.lazy(() => import("./WeeklyCheck"));
const Schedule = React.lazy(() => import("./MaintenanceSchedule"));
const Records = React.lazy(() => import("./MaintenanceRecords"));
const Settings = React.lazy(() => import("./MaintenanceSettings"));

export default function MineRouter() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
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
        <Route path="settings" element={<Settings />} />
      </Routes>
    </React.Suspense>
  );
}
