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
    Hammer,
    CheckCircle,
    Plus,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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

    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFabOpen, setIsFabOpen] = useState(false);

    // Mengambil ringkasan backlog dan supply dari Supabase.
    // Query dan perhitungan dipertahankan dari implementasi sebelumnya.
    useEffect(() => {
        const fetchSummaryData = async () => {
            setLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const openStatuses = '("closed", "completed")';

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
                    supply: { waitingForParts: waitingForPartsData ?? 0 },
                });
            } catch (error) {
                console.error('Gagal mengambil data summary:', error);
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

    // Menutup menu aksi dengan tombol Escape.
    useEffect(() => {
        if (!isFabOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsFabOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFabOpen]);

    // Jika drawer navigasi mobile dibuka dari Layout, tutup FAB agar keduanya
    // tidak tampil bersamaan dan tidak saling menutupi.
    useEffect(() => {
        const closeFabWhenSidebarOpens = () => setIsFabOpen(false);
        window.addEventListener('msm:mobile-sidebar-open', closeFabWhenSidebarOpens);

        return () => {
            window.removeEventListener('msm:mobile-sidebar-open', closeFabWhenSidebarOpens);
        };
    }, []);

    const handleNavigate = (path: string) => {
        setIsFabOpen(false);
        navigate(path);
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center gap-3 px-4 text-center">
                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                <p className="text-base text-gray-600">Memuat data dashboard...</p>
            </div>
        );
    }

    const quickActions = [
        {
            label: 'Borrow Tool',
            path: '/toolroom/borrow',
            icon: ClipboardList,
            color: 'bg-indigo-600 hover:bg-indigo-700',
            title: 'Form Peminjaman',
        },
        {
            label: 'Return Tool',
            path: '/toolroom/return-tools',
            icon: CheckCircle,
            color: 'bg-green-600 hover:bg-green-700',
            title: 'Form Pengembalian',
        },
        {
            label: 'Add Backlog',
            path: '/Backlog/input',
            icon: ListPlus,
            color: 'bg-blue-600 hover:bg-blue-700',
            title: 'Add Backlog',
        },
        {
            label: 'Add Report',
            path: '/reports/new',
            icon: PlusCircle,
            color: 'bg-blue-600 hover:bg-blue-700',
            title: 'Add Report',
        },
    ];

    return (
        <div className="relative min-w-0 w-full bg-gray-50 pb-24 md:pb-0">
            <header className="mb-6 flex flex-col items-start justify-between gap-2 sm:mb-8 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold leading-tight text-gray-800 sm:text-3xl">
                        Selamat Datang, {user?.name || user?.email || 'Pengguna'}!
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 sm:text-base">
                        Berikut adalah ringkasan aktivitas dari sistem manajemen Anda.
                    </p>
                </div>
            </header>

            <main className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4 xl:gap-6">
                {/* 1. R&M Activity */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-orange-100 p-3"><Wrench className="text-orange-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-orange-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">R&M Activity</h3>
                        <p className="mt-1 text-sm text-gray-500">Jadwal &amp; Laporan Perbaikan</p>
                    </div>
                    <div className="mt-5 space-y-2 border-t pt-4 text-sm sm:mt-6">
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Jadwal Hari Ini:</span>
                            <span className="font-bold tabular-nums text-orange-600">{summaryData?.rmActivity.today ?? 0}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-600">Terlewat:</span>
                            <span className="font-bold tabular-nums text-red-600">{summaryData?.rmActivity.overdue ?? 0}</span>
                        </div>
                    </div>
                </button>

                {/* 2. Backlog Management */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/backlog/dashboard')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-red-100 p-3"><ClipboardList className="text-red-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-red-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">Backlog</h3>
                        <p className="mt-1 text-sm text-gray-500">Manajemen Pekerjaan Tertunda</p>
                    </div>
                    <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-sm sm:mt-6">
                        <span className="text-gray-600">Prioritas Tinggi:</span>
                        <span className="font-bold tabular-nums text-red-600">{summaryData?.backlog.highPriority ?? 0}</span>
                    </div>
                </button>

                {/* 3. Supply Management */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/supply/backlog')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-green-100 p-3"><Warehouse className="text-green-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-green-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">Supply Management</h3>
                        <p className="mt-1 text-sm text-gray-500">Stok &amp; Pengadaan Sparepart</p>
                    </div>
                    <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-sm sm:mt-6">
                        <span className="text-gray-600">Menunggu Part:</span>
                        <span className="font-bold tabular-nums text-green-600">{summaryData?.supply.waitingForParts ?? 0}</span>
                    </div>
                </button>

                {/* 4. Mine Maintenance */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/mine-maintenance')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-blue-100 p-3"><HardHat className="text-blue-600" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-blue-600" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">Mine Maintenance</h3>
                        <p className="mt-1 text-sm text-gray-500">Equipment, Komponen &amp; Hour Meter</p>
                    </div>
                    <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-sm sm:mt-6">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-bold text-blue-600">Online</span>
                    </div>
                </button>

                {/* 5. Tool Room */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/toolroom/dashboard')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-indigo-100 p-3"><Hammer className="text-indigo-600" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-indigo-600" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">Tool Room</h3>
                        <p className="mt-1 text-sm text-gray-500">Peminjaman, Pengembalian &amp; Stok Alat</p>
                    </div>
                    <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-sm sm:mt-6">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-bold text-indigo-600">Active</span>
                    </div>
                </button>

                {/* 6. Administrator */}
                <button
                    type="button"
                    onClick={() => handleNavigate('/konfigurasi')}
                    className="group w-full min-w-0 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 sm:p-6"
                >
                    <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-gray-100 p-3"><Shield className="text-gray-500" size={28} /></div>
                        <ArrowRight className="text-gray-400 transition-colors group-hover:text-gray-600" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-gray-800 sm:text-xl">Administrator</h3>
                        <p className="mt-1 text-sm text-gray-500">Pengaturan Pengguna &amp; Sistem</p>
                    </div>
                    <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-sm sm:mt-6">
                        <span className="text-gray-600">Akses:</span>
                        <span className="font-bold text-gray-800">Level Admin</span>
                    </div>
                </button>
            </main>

            {/* Footer berada di alur halaman, bukan di dalam elemen fixed. */}
            <footer className="mt-7 text-right text-xs text-blue-300 sm:mt-8 sm:text-sm">
                Site MSM, PT Sumbawa Jutaraya
            </footer>

            {/* Desktop: empat shortcut tetap terlihat seperti desain sebelumnya. */}
            <div className="fixed bottom-6 right-6 z-30 hidden flex-col items-end gap-2 md:flex">
                {quickActions.map(({ label, path, icon: Icon, color, title }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => handleNavigate(path)}
                        className={`${color} flex items-center justify-center rounded-full p-3 text-white shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2`}
                        title={title}
                    >
                        <Icon size={24} />
                        <span className="ml-2 text-sm font-medium">{label}</span>
                    </button>
                ))}
            </div>

            {/* Mobile: expandable FAB agar shortcut tidak menutupi dashboard. */}
            <div className="fixed right-4 z-40 md:hidden" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                {isFabOpen && (
                    <button
                        type="button"
                        aria-label="Tutup menu aksi"
                        className="fixed inset-0 z-30 cursor-default bg-slate-950/25 backdrop-blur-[1px] transition-opacity"
                        onClick={() => setIsFabOpen(false)}
                    />
                )}

                <div className="relative z-40 flex flex-col items-end gap-3">
                    {isFabOpen && quickActions.map(({ label, path, icon: Icon, color, title }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => handleNavigate(path)}
                            className="relative z-40 flex min-h-11 items-center gap-3 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-black/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            title={title}
                        >
                            <span>{label}</span>
                            <span className={`${color} flex h-10 w-10 items-center justify-center rounded-full text-white`}>
                                <Icon size={20} />
                            </span>
                        </button>
                    ))}

                    <button
                        type="button"
                        aria-label={isFabOpen ? 'Tutup shortcut' : 'Buka shortcut'}
                        aria-expanded={isFabOpen}
                        onClick={() => setIsFabOpen((current) => !current)}
                        className="relative z-40 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl transition-transform duration-200 hover:bg-violet-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                    >
                        {isFabOpen ? <X size={25} /> : <Plus size={26} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
