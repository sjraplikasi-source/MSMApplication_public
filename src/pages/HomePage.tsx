// src/pages/HomePage.tsx

import React, { useEffect, useState } from 'react';
import { 
    Wrench,           
    ClipboardList,    
    Warehouse,        
    Shield,          
    ArrowRight,
    PlusCircle,
    Loader2,
    ListPlus,
    HardHat,
    Tool,
    Hammer,
    CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '../components/ui/button';

// Tipe data untuk summary
interface SummaryData {
    rmActivity: {
        today: number;
        overdue: number;
    };
    backlog: {
        highPriority: number;
    };
    supply: {
        waitingForParts: number;
    };
}

const HomePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State untuk data dan loading
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    // Fungsi untuk mengambil semua data summary dari Supabase
    useEffect(() => {
        const fetchSummaryData = async () => {
            setLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const openStatuses = '("closed", "completed")'; // Status yang dianggap selesai

                const { count: todayCount } = await supabase
                    .from('backlogs')
                    .select('*', { count: 'exact', head: true })
                    .eq('scheduled_date', today);

                const { count: overdueCount } = await supabase
                    .from('backlogs')
                    .select('*', { count: 'exact', head: true })
                    .lt('scheduled_date', today)
                    .not('status', 'in', openStatuses);

                const { count: highPriorityCount } = await supabase
                    .from('backlogs')
                    .select('*', { count: 'exact', head: true })
                    .not('status', 'in', openStatuses)
                    .eq('priority', 'High');

                const { data: waitingForPartsData, error: rpcError } = await supabase.rpc('get_waiting_for_parts_count');
                if (rpcError) throw rpcError;
                
                setSummaryData({
                    rmActivity: { today: todayCount ?? 0, overdue: overdueCount ?? 0 },
                    backlog: { highPriority: highPriorityCount ?? 0 },
                    supply: { waitingForParts: waitingForPartsData ?? 0 }
                });
            } catch (error) {
                console.error("Gagal mengambil data summary:", error);
                setSummaryData({
                    rmActivity: { today: 0, overdue: 0 },
                    backlog: { highPriority: 0 },
                    supply: { waitingForParts: 0 },
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSummaryData();
    }, []);

    const handleNavigate = (path: string) => navigate(path);

    // Tampilan saat loading
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="ml-4 text-lg text-gray-600">Memuat data dashboard...</p>
            </div>
        );
    }

    return (
        <div className="p-6 sm:p-8 bg-gray-50 min-h-screen relative">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        Selamat Datang, {user?.name || user?.email || 'Pengguna'}!
                    </h1>
                    <p className="mt-1 text-gray-500">
                        Berikut adalah ringkasan aktivitas dari sistem manajemen Anda.
                    </p>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. R&M Activity */}
                <div 
                    onClick={() => handleNavigate('/dashboard')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-orange-100 p-3 rounded-lg"><Wrench className="text-orange-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">R&M Activity</h3>
                        <p className="text-sm text-gray-500 mt-1">Jadwal & Laporan Perbaikan</p>
                    </div>
                    <div className="mt-6 border-t pt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Jadwal Hari Ini:</span>
                            <span className="font-bold text-orange-600">{summaryData?.rmActivity.today}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Terlewat:</span>
                            <span className="font-bold text-red-600">{summaryData?.rmActivity.overdue}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Backlog Management */}
                <div 
                    onClick={() => handleNavigate('/backlog/dashboard')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-red-100 p-3 rounded-lg"><ClipboardList className="text-red-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 group-hover:text-red-500 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">Backlog</h3>
                        <p className="text-sm text-gray-500 mt-1">Manajemen Pekerjaan Tertunda</p>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-between text-sm">
                        <span className="text-gray-600">Prioritas Tinggi:</span>
                        <span className="font-bold text-red-600">{summaryData?.backlog.highPriority}</span>
                    </div>
                </div>

                {/* 3. Supply Management */}
                <div 
                    onClick={() => handleNavigate('/supply/backlog')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-green-100 p-3 rounded-lg"><Warehouse className="text-green-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 group-hover:text-green-500 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">Supply Management</h3>
                        <p className="text-sm text-gray-500 mt-1">Stok & Pengadaan Sparepart</p>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-between text-sm">
                        <span className="text-gray-600">Menunggu Part:</span>
                        <span className="font-bold text-green-600">{summaryData?.supply.waitingForParts}</span>
                    </div>
                </div>

                {/* 4. Mine Maintenance */}
                <div 
                    onClick={() => handleNavigate('/mine-maintenance')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <HardHat className="text-blue-600" size={28} />
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">Mine Maintenance</h3>
                        <p className="text-sm text-gray-500 mt-1">Equipment, Komponen & Hour Meter</p>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-bold text-blue-600">Online</span>
                    </div>
                </div>

                {/* 5. 🧰 Tool Room */}
                <div 
                    onClick={() => handleNavigate('/toolroom/dashboard')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-indigo-100 p-3 rounded-lg">
                            <Hammer className="text-indigo-600" size={28} />
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">Tool Room</h3>
                        <p className="text-sm text-gray-500 mt-1">Peminjaman, Pengembalian & Stok Alat</p>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-bold text-indigo-600">Active</span>
                    </div>
                </div>

                {/* 6. Administrator */}
                <div 
                    onClick={() => handleNavigate('/konfigurasi')}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="bg-gray-100 p-3 rounded-lg"><Shield className="text-gray-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-800">Administrator</h3>
                        <p className="text-sm text-gray-500 mt-1">Pengaturan Pengguna & Sistem</p>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-between text-sm">
                        <span className="text-gray-600">Akses:</span>
                        <span className="font-bold text-gray-800">Level Admin</span>
                    </div>
                </div>
            </main>
            
            {/* 🔘 Floating Buttons */}
            <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2">
                {/* Add Tool Borrow */}
                <button
                    onClick={() => handleNavigate('/toolroom/borrow')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                    title="Form Peminjaman"
                >
                    <ClipboardList size={24} />
                    <span className="ml-2 text-sm font-medium">Borrow Tool</span>
                </button>

                {/* Return Tool */}
                <button
                    onClick={() => handleNavigate('/toolroom/return-tools')}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                    title="Form Pengembalian"
                >
                    <CheckCircle size={24} />
                    <span className="ml-2 text-sm font-medium">Return Tool</span>
                </button>

                {/* Add Backlog */}
                <button
                    onClick={() => handleNavigate('/Backlog/input')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                    title="Add Backlog"
                >
                    <ListPlus size={24} />
                    <span className="ml-2 text-sm font-medium">Add Backlog</span>
                </button>

                {/* Add Report */}
                <button
                    onClick={() => handleNavigate('/reports/new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                    title="Add Report"
                >
                    <PlusCircle size={24} />
                    <span className="ml-2 text-sm font-medium">Add Report</span>
                </button>

              
                <div>
                    <p className="mt-1 text-gray-500">
                        Site MSM Dept. PT Sumbawa Jutaraya
                    </p>
                </div>

            </div>
        </div>
    );
};


export default HomePage;
