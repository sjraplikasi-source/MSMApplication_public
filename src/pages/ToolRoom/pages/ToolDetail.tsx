import React from "react";
import { useParams } from "react-router-dom";

export default function ToolDetail() {
  const { id } = useParams();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Detail Tool</h2>
      <p>Menampilkan informasi detail untuk tool dengan ID: {id}</p>
    </div>
  );
}
