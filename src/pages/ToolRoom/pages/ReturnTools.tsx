// src/pages/ToolRoom/pages/ReturnTools.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ReturnPhotoModal } from "../components/ReturnPhotoModal";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, FileImage } from "lucide-react";
import toast from "react-hot-toast";

export default function ReturnTools() {
  const [loans, setLoans] = useState<any[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBorrowedTools();
  }, []);

  const fetchBorrowedTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tool_loans")
        .select("*, tools(name), employees(name)")
        .eq("status", "borrowed")
        .order("borrowed_at", { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data peminjaman");
    }
  };

  const handleReturn = (loan) => {
    setSelectedLoan(loan);
    setShowModal(true);
  };

  const handleReturnSubmit = async (photo: File) => {
    if (!selectedLoan) return;

    try {
      const fileName = `${selectedLoan.id}-${Date.now()}.${photo.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tool-returns")
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tool-returns")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("tool_loans")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
          return_photo_url: publicUrl,
        })
        .eq("id", selectedLoan.id);

      if (updateError) throw updateError;

      toast.success("Tool berhasil dikembalikan");
      setShowModal(false);
      setSelectedLoan(null);
      fetchBorrowedTools();
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengembalikan alat");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Return Tools</h1>

      <Card>
        <CardContent className="p-4">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="py-2 px-4 text-left">Tool</th>
                <th className="py-2 px-4 text-left">Employee</th>
                <th className="py-2 px-4 text-left">Borrowed At</th>
                <th className="py-2 px-4 text-left">Expected Return</th>
                <th className="py-2 px-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-t">
                  <td className="py-2 px-4">{loan.tools?.name}</td>
                  <td className="py-2 px-4">{loan.employees?.name}</td>
                  <td className="py-2 px-4">
                    {new Date(loan.borrowed_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4">
                    {new Date(loan.expected_return_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => handleReturn(loan)}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Return
                    </button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td className="text-center text-gray-500 py-4" colSpan={5}>
                    Tidak ada alat yang sedang dipinjam
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showModal && (
        <ReturnPhotoModal
          onClose={() => setShowModal(false)}
          onSubmit={handleReturnSubmit}
        />
      )}
    </div>
  );
}
