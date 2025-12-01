// src/pages/ToolRoom/index.tsx
import React from "react";
import ToolRoomRouter from "./ToolRoomRouter";

export default function ToolRoom() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tool Room Management</h1>
      <ToolRoomRouter />
    </div>
  );
}
