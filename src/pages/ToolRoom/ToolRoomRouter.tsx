// src/pages/ToolRoom/ToolRoomRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ToolList from "./pages/ToolList";
import BorrowReturn from "./pages/BorrowReturn";
import Reports from "./pages/Reports";
import ToolDetail from "./pages/ToolDetail";

export default function ToolRoomRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="list" replace />} />
      <Route path="list" element={<ToolList />} />
      <Route path="borrow" element={<BorrowReturn />} />
      <Route path="reports" element={<Reports />} />
      <Route path="detail/:id" element={<ToolDetail />} />
      <Route path="dashboard" element={<Dashboard />} />
    </Routes>
  );
}
