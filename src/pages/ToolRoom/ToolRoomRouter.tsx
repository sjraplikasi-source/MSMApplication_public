// src/pages/ToolRoom/ToolRoomRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ToolList from "./pages/ToolList";
import BorrowReturn from "./pages/BorrowReturn";
import Reports from "./pages/Reports";
import ToolDetail from "./pages/ToolDetail";
import Dashboard from "./pages/Dashboard";
import ReturnTools from "./pages/ReturnTools";

export default function ToolRoomRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="list" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="list" element={<ToolList />} />
      <Route path="borrow" element={<BorrowReturn />} />
      <Route path="reports" element={<Reports />} />
      <Route path="detail/:id" element={<ToolDetail />} />
      <Route path="return-tools" element={<ReturnTools />} />

    </Routes>
  );
}
