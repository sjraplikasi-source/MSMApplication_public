// src/components/Layout.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Wrench, LogOut, ChevronDown, Bell, Menu, BarChart2,
  ClipboardList, Settings, Users, UserPlus, CheckCircle, Calendar, ListChecks, Power, Zap, ChevronRight, BarChartHorizontal, Home
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface LayoutProps { children: React.ReactNode; }
type NavItem = { path: string; label: string; icon: React.ComponentType<any>; prefix?: string };

// --- Komponen Grup Menu Akordion ---
// --- PERUBAHAN (Terima prop 'onLinkClick') ---
const AccordionMenuGroup = ({ title, items, isActive, onClick, currentPath, isSidebarExpanded, onLinkClick }) => (
  <div className="mb-2">
    <button onClick={onClick} className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md">
      <span className={!isSidebarExpanded ? 'hidden' : ''}>{title}</span>
      <ChevronRight size={16} className={`transition-transform duration-200 ${isActive ? 'rotate-90' : ''} ${!isSidebarExpanded ? 'hidden' : ''}`} />
    </button>
    {(isActive || !isSidebarExpanded) && (
      <div className={`mt-1 ${isSidebarExpanded ? 'pl-2' : ''}`}>
        {items.map(item => (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${currentPath.startsWith(item.prefix || item.path) ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"} ${!isSidebarExpanded ? 'justify-center' : ''}`}
            // --- PERUBAHAN (Tambahkan onClick di sini) ---
            onClick={onLinkClick}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className={!isSidebarExpanded ? 'hidden' : 'whitespace-nowrap'}>{item.label}</span>
          </Link>
        ))}
      </div>
    )}
  </div>
);

// --- Komponen Layout Utama ---
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Default diciutkan
  const [activeMenu, setActiveMenu] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || user?.email || "User";
  const userInitials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const path = location.pathname;

  // --- Logika Hak Akses (Role) dari Versi Lama ---
  const normalizeRole = (r: any) => String(r ?? "").trim().toLowerCase().replace(/[\s_]+/g, "");
  const roleKey = normalizeRole(user?.role);
  const isAdmin = ["admin","administrator","superadmin"].includes(roleKey);
  const isSupplyOnly = ["sm","supply","supplymanager","supplymanagement"].includes(roleKey);
  
  // tempat tambah role
  const ROLE_ACCESS: Record<string,string[]> = {
    admin: ["*"], administrator: ["*"], superadmin: ["*"],
    sm: ["/dashboard", "/supply/backlog"],
    supply: ["/dashboard", "/supply/backlog"],
    supplymanager: ["/dashboard", "/supply/backlog"],
    supplymanagement: ["/dashboard", "/supply/backlog"],
    engineer: ["/dashboard", "/reports", "/validasi", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom", "/mine-maintenance"],
    groupleader: ["/dashboard", "/reports", "/validasi", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom", "/mine-maintenance"],
    mechanic: ["/dashboard", "/reports", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom"],
    planner: ["/dashboard", "/reports", "/validasi", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom", "/mine-maintenance", "/supply/backlog"],
    superintendent: ["/dashboard", "/reports", "/validasi", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom", "/mine-maintenance", "/supply/backlog"],
    supervisor: ["/dashboard", "/reports", "/validasi", "/pareto", "/download", "/Backlog", "/backlog", "/toolroom", "/mine-maintenance", "/supply/backlog"],
  };
  
  const matchPrefix = (prefix: string, target: string) => target === prefix || target.startsWith(prefix + "/");
  const canSee = (p: string) => {
    if (isAdmin) return true;
    const allowed = ROLE_ACCESS[roleKey] || [];
    return allowed.includes("*") || allowed.some(prefix => matchPrefix(prefix, p));
  };

  // --- Definisi Menu ---
  const NAV_DAILY: NavItem[] = [
    { path: "/dashboard", label: "Dashboard R&M", icon: LayoutDashboard },
    { path: "/reports", label: "Reports", icon: FileText, prefix: "/reports" },
    { path: "/validasi", label: "Reports Validation", icon: CheckCircle },
    { path: "/pareto", label: "Pareto R&M Activity", icon: BarChart2 },
    { path: "/download", label: "Download", icon: FileText },
  ];
  const NAV_BACKLOG: NavItem[] = [
    { path: "/backlog/dashboard", label: "Dashboard Backlog", icon: BarChart2 },
    { path: "/Backlog/input", label: "Backlog Input", icon: ClipboardList },
    { path: "/Backlog/validasi", label: "Backlog Validation", icon: CheckCircle },
    { path: "/Backlog/review", label: "Backlog Review", icon: ClipboardList },
    { path: "/Backlog/list", label: "Backlog List", icon: ClipboardList },    
    { path: "/backlog/scheduling", label: "Scheduling", icon: Calendar },
    { path: "/backlog/work-schedule", label: "Work Schedule", icon: ListChecks },
    { path: "/backlog/shutdown-planner", label: "Shutdown Planner", icon: Power }, 
  ];
  // Tambahkan menu Mine Maintenance
  const NAV_MINE: NavItem[] = [
    { path: "/mine-maintenance/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/mine-maintenance/equipment", label: "Equipment", icon: Wrench },
    { path: "/mine-maintenance/components", label: "Components", icon: ClipboardList },
    { path: "/mine-maintenance/hour-meter", label: "Hour Meter", icon: Calendar },
    { path: "/mine-maintenance/weekly-check", label: "Weekly Check", icon: CheckCircle },
    { path: "/mine-maintenance/schedule", label: "Maintenance Schedule", icon: Calendar },
    { path: "/mine-maintenance/records", label: "Maintenance Records", icon: FileText },
    { path: "/mine-maintenance/planning", label: "Planning", icon: ListChecks },
    { path: "/mine-maintenance/settings", label: "Maintenance Settings", icon: Settings },
  ];
  // Tambahkan menu Tool Room
  const NAV_TOOLROOM: NavItem[] = [
    { path: "/toolroom/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/toolroom/list", label: "Tool List", icon: Wrench },
    { path: "/toolroom/borrow", label: "Form Loan", icon: ClipboardList },
    { path: "/toolroom/reports", label: "Reports", icon: BarChart2 },
    { path: "/toolroom/return-tools", label: "Return Tools", icon: CheckCircle },
  ];
  const NAV_SUPPLY: NavItem[] = [
    { path: "/supply/backlog", label: "SM — Backlog", icon: ClipboardList, prefix: "/supply/backlog" },
  ];
  //const NAV_OPERATIONAL: NavItem[] = [
  //  { path: "/operational/energy-input", label: "Energy Input", icon: Zap },
  //  { path: "/operational/energy-monitoring", label: "Monitoring Energi", icon: BarChartHorizontal },
  // ];
  const NAV_ADMIN: NavItem[] = [
    { path: "/register", label: "User Register", icon: UserPlus },
    { path: "/konfigurasi", label: "Configuration", icon: Settings },
    { path: "/aktivasi", label: "User Activation", icon: Users },
  ];
  
  // --- Logika untuk Menampilkan Menu Sesuai Role ---
  const sidebarMenus = useMemo(() => {
    const menus = [];
    if (!isSupplyOnly) menus.push({ id: 'daily', title: 'R&M Activity', items: NAV_DAILY.filter(item => canSee(item.path)) });
    if (!isSupplyOnly) menus.push({ id: 'backlog', title: 'Backlog', items: NAV_BACKLOG.filter(item => canSee(item.path)) });
    if (!isSupplyOnly) menus.push({ id: 'mine', title: 'Mine Maintenance', items: NAV_MINE.filter(item => canSee(item.path)) });
    if (!isSupplyOnly) menus.push({ id: 'toolroom', title: 'Tool Room', items: NAV_TOOLROOM.filter(item => canSee(item.path)) });
    if (isSupplyOnly || isAdmin) menus.push({ id: 'SM', title: 'Supply Management', items: NAV_SUPPLY.filter(item => canSee(item.path)) });
    // menus.push({ id: 'operational', title: 'Operational Performance', items: NAV_OPERATIONAL.filter(item => canSee(item.path)) });
    if (isAdmin) menus.push({ id: 'admin', title: 'Admin', items: NAV_ADMIN.filter(item => canSee(item.path)) });
    return menus.filter(menu => menu.items.length > 0);
  }, [user, roleKey, isAdmin, isSupplyOnly]);

  useEffect(() => {
    const currentMenu = sidebarMenus.find(menu => menu.items.some(item => path.startsWith(item.prefix || item.path)));
    if (currentMenu) setActiveMenu(currentMenu.id);
  }, [path, sidebarMenus]);

  const handleMenuClick = (menuId: string) => setActiveMenu(prev => (prev === menuId ? '' : menuId));
  const handleLogout = async () => { await logout(); navigate("/login", { replace: true }); };

  // --- PERUBAHAN: Buat fungsi untuk menutup sidebar saat link diklik ---
  const handleLinkClick = () => {
    // Hanya tutup jika sedang dalam mode mobile (isMobileOpen = true)
    if (isMobileOpen) {
      setIsMobileOpen(false);
      setIsSidebarExpanded(false);
    }
    // Jika di desktop, sidebar biarkan saja (karena dia mode hover)
  };

  // ====== BADGE NOTIFIKASI (Realtime) ======
  const [notifCount, setNotifCount] = useState(0);
  
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;
      try {
        const { count } = await supabase
          .from("notifications")
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .or(`target_user.eq.${user.id},target_role.eq.${roleKey},and(target_user.is.null,target_role.is.null)`);
        setNotifCount(count || 0);
      } catch (e) {
        console.error("Gagal mengambil jumlah notifikasi:", e);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roleKey]);

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        // --- PERUBAHAN: Hanya jalankan hover jika menu mobile TIDAK sedang terbuka
        onMouseEnter={() => {
          if (!isMobileOpen) {
            setIsSidebarExpanded(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobileOpen) {
            setIsSidebarExpanded(false);
          }
        }}
        className={`fixed z-50 top-0 left-0 h-full bg-white border-r transition-all duration-300 ease-in-out
          ${isSidebarExpanded ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <div className="p-5 flex items-center gap-2 border-b">
          <Wrench className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <h1 className={`text-lg font-bold text-gray-800 transition-opacity duration-200 whitespace-nowrap ${!isSidebarExpanded ? 'opacity-0' : 'opacity-100'}`}>MSM App</h1>
        </div>
        <nav className="mt-4 px-3 pb-24 overflow-y-auto h-[calc(100%-70px)]">
          {/* MENU HOME DITAMBAHKAN DI SINI */}
          <Link
            to="/"
            title="Home"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-colors text-sm font-semibold
            ${path === '/' ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"}
            ${!isSidebarExpanded ? 'justify-center' : ''}`}
            // --- PERUBAHAN: Tambahkan onClick di sini ---
            onClick={handleLinkClick}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className={!isSidebarExpanded ? 'hidden' : 'whitespace-nowrap'}>Home</span>
          </Link>
          
          {/* Pembatas visual */}
          <hr className="mx-2 mb-4 border-gray-200" />
          
          {sidebarMenus.map(menu => (
            <AccordionMenuGroup
              key={menu.id}
              title={menu.title}
              items={menu.items}
              isActive={activeMenu === menu.id}
              onClick={() => handleMenuClick(menu.id)}
              currentPath={path}
              isSidebarExpanded={isSidebarExpanded}
              // --- PERUBAHAN: Kirim fungsi sebagai prop ---
              onLinkClick={handleLinkClick}
            />
          ))}
        </nav>
      </div>

      {/* --- PERUBAHAN (Overlay) --- */}
      {/* Overlay untuk menutup menu di mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden" 
          onClick={() => {
            setIsMobileOpen(false);
            setIsSidebarExpanded(false); // Reset expand saat ditutup
          }} 
        />
      )}
      {/* --- Akhir Perubahan --- */}

      {/* --- PERUBAHAN: Tombol FAB (Floating Action Button) DENGAN LABEL --- */}
      {/* Wrapper div ini sekarang memegang posisi fixed */}
      <div className="fixed bottom-6 left-6 z-30 lg:hidden flex flex-col items-center gap-1">
        {/* Tombol FAB */}
        <button
          onClick={() => {
            setIsMobileOpen(true);
            setIsSidebarExpanded(true); // Paksa expand saat dibuka
          }}
          className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
          title="Buka Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Label Teks di Bawah Tombol */}
        <span className="text-xs font-semibold text-gray-800 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md">
          Menu
        </span>
      </div>
      {/* --- Akhir Perubahan FAB --- */}


      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            
            {/* --- PERUBAHAN: Tombol hamburger di header DIHAPUS --- */}

            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Maintenance & SM</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center"><input className="border rounded-lg px-3 py-1.5 text-sm w-56" placeholder="Search (Ctrl/Cmd + K)" readOnly /></div>
            <button className="relative p-2 text-gray-600 hover:text-gray-800" onClick={() => navigate("/notifications")} title="Notifikasi">
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] leading-4 rounded-full text-center">
                  {notifCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-sm font-medium text-blue-600">{userInitials}</span></div>
              <button className="hidden sm:flex items-center gap-1 text-sm text-gray-600"><span>{userName}</span><ChevronDown className="h-4 w-4" /></button>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-gray-800" title="Logout"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;