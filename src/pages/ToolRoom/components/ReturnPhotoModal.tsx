// src/pages/ToolRoom/components/ReturnPhotoModal.tsx
import React, { useState } from "react";
import { Camera, X } from "lucide-react";

interface ReturnPhotoModalProps {
  onClose: () => void;
  onSubmit: (photo: File) => void;
}

export function ReturnPhotoModal({ onClose, onSubmit }: ReturnPhotoModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran foto maksimal 5MB");
      return;
    }

    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (photo) {
      onSubmit(photo);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upload Return Photo</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-yellow-700 text-sm">
              <strong>Catatan:</strong> Pastikan kondisi alat bersih dan lengkap sebelum upload.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto Kondisi Tool
            </label>
            <div className="flex items-center justify-center w-full">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setPhoto(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <Camera className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Ambil foto atau upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    capture="environment"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!photo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            Upload & Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
