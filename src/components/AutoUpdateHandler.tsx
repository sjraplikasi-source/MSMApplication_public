// src/components/AutoUpdateHandler.tsx

import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const AutoUpdateHandler: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // 1. Cek versi saat pertama kali load
    let currentVersion: number | null = null;

    const checkVersion = async () => {
      try {
        // Tambah timestamp di URL fetch agar browser TIDAK men-cache request ini
        const res = await fetch(`/version.json?t=${Date.now()}`);
        const data = await res.json();
        const serverVersion = data.version;

        if (currentVersion === null) {
          // Init pertama kali
          currentVersion = serverVersion;
        } else if (currentVersion !== serverVersion) {
          // Jika versi di memori beda dengan server -> Munculkan Notifikasi
          setShowUpdate(true);
        }
      } catch (error) {
        console.error("Gagal cek versi:", error);
      }
    };

    // Jalankan pengecekan pertama
    checkVersion();

    // 2. Set interval pengecekan setiap 60 detik (1 menit)
    // Jangan terlalu cepat biar gak membebani server, jangan terlalu lama biar update cepat sampai.
    const interval = setInterval(checkVersion, 60 * 1000);

    // Bersihkan interval saat komponen di-unmount
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    // Reload halaman secara paksa & bersihkan cache
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-bounce-slow">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 max-w-sm border-2 border-white">
        <div className="bg-white/20 p-2 rounded-full">
            <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Update Tersedia!</h4>
          <p className="text-xs text-blue-100 mt-1">
            Versi baru aplikasi telah dirilis. Silakan refresh untuk fitur terbaru.
          </p>
        </div>
        <div className="flex flex-col gap-2">
            <button 
                onClick={handleRefresh}
                className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
            >
                Refresh
            </button>
            <button 
                onClick={() => setShowUpdate(false)}
                className="text-blue-200 hover:text-white text-xs"
            >
                Nanti
            </button>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdateHandler;