// src/pages/ToolRoom/components/BarcodeScanner.tsx
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    codeReader.current
      .listVideoInputDevices()
      .then((devices) => {
        if (devices.length > 0) {
          const deviceId = devices[0].deviceId;
          codeReader.current?.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
            if (result) {
              onScan(result.getText());
              onClose();
            }
          });
        }
      })
      .catch((err) => console.error(err));

    return () => {
      codeReader.current?.reset();
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="relative w-full max-w-md bg-white rounded-lg overflow-hidden shadow-xl">
        <div className="flex justify-between items-center p-3 border-b">
          <h3 className="font-semibold text-gray-800">Scan QR / Barcode</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-2">
          <video ref={videoRef} className="w-full h-64 bg-black rounded-md" autoPlay muted playsInline />
        </div>
      </div>
    </div>
  );
}
