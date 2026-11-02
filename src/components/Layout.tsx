// src/components/Layout.tsx
// UI refresh MSM Application - desktop and mobile responsive.
// Business logic (role access, routes, authentication, and notifications) is retained.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart2,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Power,
  Settings,
  UserRound,
  UserPlus,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface LayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  prefix?: string;
};

type MenuGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

interface AccordionMenuGroupProps {
  title: string;
  items: NavItem[];
  isActive: boolean;
  onToggle: () => void;
  currentPath: string;
  isSidebarExpanded: boolean;
  onLinkClick: () => void;
}

const isPathActive = (item: NavItem, currentPath: string) => {
  const prefix = item.prefix || item.path;
  return currentPath === prefix || currentPath.startsWith(`${prefix}/`);
};

const AccordionMenuGroup: React.FC<AccordionMenuGroupProps> = ({
  title,
  items,
  isActive,
  onToggle,
  currentPath,
  isSidebarExpanded,
  onLinkClick,
}) => {
  if (items.length === 0) return null;

  const linkBaseClass =
    "group flex items-center rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
  const activeClass =
    "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/20";
  const inactiveClass = "text-slate-400 hover:bg-white/[0.07] hover:text-white";

  return (
    <section className="mb-3">
      {isSidebarExpanded ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isActive}
            className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
          >
            <span>{title}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${
                isActive ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>

          {isActive && (
            <div className="space-y-1 pl-1">
              {items.map((item) => {
                const active = isPathActive(item, currentPath);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onLinkClick}
                    aria-current={active ? "page" : undefined}
                    className={`${linkBaseClass} min-h-10 w-full gap-3 px-3 py-2 ${
                      active ? activeClass : inactiveClass
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // In collapsed mode, show every item icon so all destinations remain reachable.
        <div className="space-y-1">
          {items.map((item) => {
            const active = isPathActive(item, currentPath);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                title={`${title} — ${item.label}`}
                aria-label={`${title} — ${item.label}`}
                aria-current={active ? "page" : undefined}
                className={`${linkBaseClass} mx-auto h-11 w-11 justify-center ${
                  active ? activeClass : inactiveClass
                }`}
              >
                <Icon size={19} className="shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Desktop sidebar is manually collapsible. Mobile uses a separate drawer state.
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("");
  const [notifCount, setNotifCount] = useState(0);

  const path = location.pathname;
  const userName = user?.name || user?.email || "User";
  const userInitials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // --- Role access logic: retained from the existing Layout ---
  const normalizeRole = (role: unknown) =>
    String(role ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "");

  const roleKey = normalizeRole(user?.role);
  const isAdmin = ["admin", "administrator", "superadmin"].includes(roleKey);
  const isSupplyOnly = ["sm", "supply", "supplymanager", "supplymanagement"].includes(
    roleKey
  );

  const ROLE_ACCESS: Record<string, string[]> = {
    admin: ["*"],
    administrator: ["*"],
    superadmin: ["*"],
    sm: ["/dashboard", "/supply/backlog", "/system/documentation"],
    supply: ["/dashboard", "/supply/backlog", "/system/documentation"],
    supplymanager: ["/dashboard", "/supply/backlog", "/system/documentation"],
    supplymanagement: ["/dashboard", "/supply/backlog", "/system/documentation"],
    engineer: [
      "/dashboard",
      "/reports",
      "/validasi",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/mine-maintenance",
      "/system/documentation",
    ],
    groupleader: [
      "/dashboard",
      "/reports",
      "/validasi",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/mine-maintenance",
      "/system/documentation",
    ],
    mechanic: [
      "/dashboard",
      "/reports",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/system/documentation",
    ],
    planner: [
      "/dashboard",
      "/reports",
      "/validasi",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/mine-maintenance",
      "/supply/backlog",
      "/system/documentation",
    ],
    superintendent: [
      "/dashboard",
      "/reports",
      "/validasi",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/mine-maintenance",
      "/supply/backlog",
      "/system/documentation",
    ],
    supervisor: [
      "/dashboard",
      "/reports",
      "/validasi",
      "/pareto",
      "/download",
      "/Backlog",
      "/backlog",
      "/toolroom",
      "/mine-maintenance",
      "/supply/backlog",
      "/system/documentation",
    ],
  };

  const matchPrefix = (prefix: string, target: string) =>
    target === prefix || target.startsWith(`${prefix}/`);

  const canSee = (route: string) => {
    if (isAdmin) return true;
    const allowed = ROLE_ACCESS[roleKey] || [];
    return allowed.includes("*") || allowed.some((prefix) => matchPrefix(prefix, route));
  };

  // --- Menu definitions: route and access definitions retained ---
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

  const NAV_TOOLROOM: NavItem[] = [
    { path: "/toolroom/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/toolroom/list", label: "Tool List", icon: Wrench },
    { path: "/toolroom/borrow", label: "Form Loan", icon: ClipboardList },
    { path: "/toolroom/reports", label: "Reports", icon: BarChart2 },
    { path: "/toolroom/return-tools", label: "Return Tools", icon: CheckCircle },
  ];

  const NAV_SUPPLY: NavItem[] = [
    {
      path: "/supply/backlog",
      label: "SM — Backlog",
      icon: ClipboardList,
      prefix: "/supply/backlog",
    },
  ];

  const NAV_ADMIN: NavItem[] = [
    { path: "/register", label: "User Register", icon: UserPlus },
    { path: "/konfigurasi", label: "Configuration", icon: Settings },
    { path: "/aktivasi", label: "User Activation", icon: Users },
  ];

  const NAV_SYSTEM: NavItem[] = [
    { path: "/system/documentation", label: "Documentation", icon: BookOpen },
  ];

  const sidebarMenus = useMemo<MenuGroup[]>(() => {
    const menus: MenuGroup[] = [];

    if (!isSupplyOnly) {
      menus.push({
        id: "daily",
        title: "R&M Activity",
        items: NAV_DAILY.filter((item) => canSee(item.path)),
      });
      menus.push({
        id: "backlog",
        title: "Backlog",
        items: NAV_BACKLOG.filter((item) => canSee(item.path)),
      });
      menus.push({
        id: "mine",
        title: "Mine Maintenance",
        items: NAV_MINE.filter((item) => canSee(item.path)),
      });
      menus.push({
        id: "toolroom",
        title: "Tool Room",
        items: NAV_TOOLROOM.filter((item) => canSee(item.path)),
      });
    }

    if (isSupplyOnly || isAdmin) {
      menus.push({
        id: "SM",
        title: "Supply Management",
        items: NAV_SUPPLY.filter((item) => canSee(item.path)),
      });
    }

    if (isAdmin) {
      menus.push({
        id: "admin",
        title: "Admin",
        items: NAV_ADMIN.filter((item) => canSee(item.path)),
      });
    }

    menus.push({
      id: "system",
      title: "System",
      items: NAV_SYSTEM.filter((item) => canSee(item.path)),
    });

    return menus.filter((menu) => menu.items.length > 0);
    // The role values determine the menu list. Route definitions above are static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey, isAdmin, isSupplyOnly]);

  // Open the group that contains the current page.
  useEffect(() => {
    const currentMenu = sidebarMenus.find((menu) =>
      menu.items.some((item) => isPathActive(item, path))
    );
    setActiveMenu(currentMenu?.id ?? "");
  }, [path, sidebarMenus]);

  // Close the mobile drawer after navigation.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [path]);

  const handleMenuToggle = (menuId: string) => {
    setActiveMenu((current) => (current === menuId ? "" : menuId));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = () => navigate("/notifications");

  // --- Realtime notification count: retained from the existing Layout ---
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) {
        setNotifCount(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("is_read", false)
          .or(
            `target_user.eq.${user.id},target_role.eq.${roleKey},and(target_user.is.null,target_role.is.null)`
          );

        if (error) throw error;
        setNotifCount(count || 0);
      } catch (error) {
        console.error("Gagal mengambil jumlah notifikasi:", error);
      }
    };

    void fetchUnread();

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void fetchUnread();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, roleKey]);

  // On mobile, the drawer must always display labels even if desktop is collapsed.
  const sidebarShowsLabels = isMobileOpen || isSidebarExpanded;

  return (
    <div className="flex h-screen h-[100dvh] min-h-0 w-full overflow-hidden bg-[#F5F6FA] text-slate-800">
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar / mobile navigation drawer */}
      <aside
        id="msm-sidebar"
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-50 flex w-[288px] max-w-[85vw] flex-col border-r border-white/5 bg-[#111827] text-slate-200 shadow-2xl transition-transform duration-300 ease-in-out lg:shadow-none lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarExpanded ? "lg:w-64" : "lg:w-[76px]"}`}
      >
        {/* Brand and desktop collapse control */}
        <div
          className={`flex h-[76px] shrink-0 items-center border-b border-white/[0.08] ${
            sidebarShowsLabels
              ? "justify-between px-4"
              : "flex-col justify-center gap-2 px-2 py-2"
          }`}
        >
          <Link
            to="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex min-w-0 items-center gap-3"
            aria-label="MSM Application - Home"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/30">
              <Activity size={22} strokeWidth={2.4} />
            </span>
            {sidebarShowsLabels && (
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold tracking-wide text-white">
                  MSM Application
                </span>
                <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Maintenance System
                </span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsSidebarExpanded((expanded) => !expanded)}
            aria-label={
              isSidebarExpanded ? "Ciutkan sidebar" : "Perluas sidebar"
            }
            aria-expanded={isSidebarExpanded}
            title={isSidebarExpanded ? "Ciutkan sidebar" : "Perluas sidebar"}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white lg:flex"
          >
            <ChevronRight
              size={19}
              className={`transition-transform duration-200 ${
                isSidebarExpanded ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]">
          <div className="mb-4">
            <Link
              to="/"
              onClick={() => setIsMobileOpen(false)}
              title={sidebarShowsLabels ? undefined : "Home"}
              aria-label="Home"
              aria-current={path === "/" ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                sidebarShowsLabels
                  ? "gap-3 px-3"
                  : "mx-auto h-11 w-11 justify-center"
              } ${
                path === "/"
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/20"
                  : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Home size={19} className="shrink-0" />
              {sidebarShowsLabels && <span>Home</span>}
            </Link>
          </div>

          <div className="mb-4 border-t border-white/[0.08]" />

          {sidebarMenus.map((menu, index) => (
            <React.Fragment key={menu.id}>
              {index > 0 && !sidebarShowsLabels && (
                <div className="mx-3 mb-3 mt-2 border-t border-white/[0.08]" />
              )}
              <AccordionMenuGroup
                title={menu.title}
                items={menu.items}
                isActive={activeMenu === menu.id}
                onToggle={() => handleMenuToggle(menu.id)}
                currentPath={path}
                isSidebarExpanded={sidebarShowsLabels}
                onLinkClick={() => setIsMobileOpen(false)}
              />
            </React.Fragment>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div
          className={`shrink-0 border-t border-white/[0.08] py-3 ${
            sidebarShowsLabels ? "px-4" : "px-2"
          }`}
        >
          {sidebarShowsLabels ? (
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>MSM Maintenance Workspace</span>
            </div>
          ) : (
            <div
              className="mx-auto h-1.5 w-1.5 rounded-full bg-emerald-400"
              title="MSM Maintenance Workspace"
            />
          )}
        </div>
      </aside>

      {/* Main workspace */}
      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
          isSidebarExpanded ? "lg:ml-64" : "lg:ml-[76px]"
        }`}
      >
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 shadow-sm shadow-slate-900/[0.02] backdrop-blur md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* Hamburger is used on mobile only. Desktop has its toggle in the sidebar. */}
            <button
              type="button"
              onClick={() => {
                // Notify HomePage to close its floating action menu before
                // the mobile navigation drawer is displayed.
                window.dispatchEvent(new Event("msm:mobile-sidebar-open"));
                setIsMobileOpen(true);
              }}
              aria-label="Buka menu navigasi"
              aria-controls="msm-sidebar"
              aria-expanded={isMobileOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">
                Maintenance &amp; SM
              </h1>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Maintenance Management Workspace
              </p>
            </div>
          </div>

          <div className="ml-2 flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={handleNotificationClick}
              aria-label={`Notifikasi${notifCount > 0 ? `, ${notifCount} belum dibaca` : ""}`}
              title="Notifikasi"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <Bell size={19} />
              {notifCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
                {userInitials || <UserRound size={16} />}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[150px] truncate text-xs font-semibold text-slate-700">
                  {userName}
                </p>
                <p className="text-[10px] capitalize text-slate-400">
                  {user?.role || "User"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
