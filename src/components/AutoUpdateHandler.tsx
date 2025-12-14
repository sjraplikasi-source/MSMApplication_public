// src/components/AutoUpdateHandler.tsx

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const AutoUpdateHandler: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    let currentVersion: number | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        
        // 1. Cek apakah request sukses (Status 200 OK)
        if (!res.ok) return;

        // 2. Cek apakah yang dikembalikan benar-benar JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // Jika balikannya HTML (<!doctype...), hentikan proses biar gak error
            return; 
        }

        const data = await res.json();
        const serverVersion = data.version;

        if (currentVersion === null) {
          currentVersion = serverVersion;
        } else if (currentVersion !== serverVersion) {
          setShowUpdate(true);
        }
      } catch (error) {
        // Silent error (jangan spam console jika gagal fetch di local)
        // console.warn("AutoUpdate check skipped:", error); 
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 60 * 1000); // Cek tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
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
            Versi baru aplikasi telah dirilis.
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