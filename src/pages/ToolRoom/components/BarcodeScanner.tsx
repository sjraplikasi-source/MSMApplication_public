// src/pages/ToolRoom/components/BarcodeScanner.tsx
import React, { useEffect, useRef } from "react";
import { X, Camera } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      codeReader.current = new BrowserMultiFormatReader();
      try {
        const devices = await codeReader.current.listVideoInputDevices();

        // Pilih kamera belakang jika ada
        const rearCamera =
          devices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("rear")
          ) || devices[devices.length - 1]; // fallback: ambil terakhir jika tidak ada label back/rear

        if (!rearCamera) {
          alert("Tidak ada kamera yang tersedia.");
          onClose();
          return;
        }

        // Mulai scanning dari kamera belakang
        await codeReader.current.decodeFromVideoDevice(
          rearCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onScan(result.getText());
              onClose();
            }
          }
        );
      } catch (error) {
        console.error("Scanner error:", error);
        alert("Gagal mengakses kamera. Pastikan izin kamera diizinkan.");
        onClose();
      }
    };

    startScanner();

    // Bersihkan scanner saat komponen ditutup
    return () => {
      codeReader.current?.reset();
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-3 border-b bg-gray-100">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <Camera className="h-5 w-5" />
            <span>Scanning Tool Barcode</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            title="Tutup Scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-2">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-md"
            autoPlay
            muted
            playsInline
          />
        </div>
        <div className="p-3 text-center text-gray-600 text-sm border-t bg-gray-50">
          Arahkan kamera ke barcode alat. Scanner akan menutup otomatis setelah terdeteksi.
        </div>
      </div>
    </div>
  );
}
