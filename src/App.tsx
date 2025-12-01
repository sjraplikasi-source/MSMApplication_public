// =============================
// src/App.tsx (Final Version)
// =============================

import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import RegisterUser from "./pages/RegisterUser";
import Dashboard from "./pages/Dashboard";
import ReportList from "./pages/ReportList";
import ReportDetail from "./pages/ReportDetail";
import ReportForm from "./pages/ReportForm";
import ReportValidation from "./pages/ReportValidation";
import Download from "./pages/Download";
import Configuration from "./pages/Configuration";
import UserActivation from "./pages/UserActivation";
import BreakdownParetoPage from "./pages/BreakdownParetoPage";
import ReportEdit from "./pages/ReportEdit";

import InputBacklog from "./pages/Backlog/BacklogForm";
import BacklogValidation from "./pages/Backlog/BacklogValidation";
import BacklogReview from "./pages/Backlog/BacklogReview";
import BacklogList from "./pages/Backlog/BacklogList";
import BacklogDetail from "./pages/Backlog/BacklogDetail";
import EditBacklog from "./pages/Backlog/EditBacklog";
import PlannerReviewDetail from "./pages/Backlog/PlannerReviewDetail";
import SupplyList from "@/pages/Backlog/SupplyList";
import SupplyDetail from "@/pages/Backlog/SupplyDetail";
import NotificationsPage from "@/pages/Notifications";
import BacklogDashboard from "@/pages/Backlog/BacklogDashboard";
import BacklogScheduling from "./pages/Backlog/BacklogScheduling";
import WorkSchedule from "./pages/Backlog/WorkSchedule";
import ShutdownPlanner from "./pages/Backlog/ShutdownPlanner";

import EnergyInput from "./pages/Operational/EnergyInput";
import EnergyMonitoring from "./pages/Operational/EnergyMonitoring";

import { useAuth } from "./context/AuthContext";
import { Toaster } from 'react-hot-toast';
import ToolRoom from "./pages/ToolRoom";


// Lazy load modul MineMaintenance
const MineRouter = lazy(() => import("@/pages/MineMaintenance/MineRouter"));

// ======================================================
// ProtectedRoute Component
// ======================================================
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, loading } = useAuth();

  // Saat sedang memeriksa sesi login
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="text-gray-500">Memuat sesi pengguna...</span>
      </div>
    );
  }

  // Jika belum login
  if (!user) return <Navigate to="/login" replace />;
  // Jika bukan admin tapi mengakses halaman admin
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

// ======================================================
// Routes
// ======================================================
function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading Mine Maintenance...</div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Layout><RegisterUser /></Layout>} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports" element={<ProtectedRoute><Layout><ReportList /></Layout></ProtectedRoute>} />
        <Route path="/reports/new" element={<ProtectedRoute><Layout><ReportForm /></Layout></ProtectedRoute>} />
        <Route path="/reports/edit/:id" element={<ProtectedRoute><Layout><ReportForm /></Layout></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute><Layout><ReportDetail /></Layout></ProtectedRoute>} />
        <Route path="/validasi" element={<ProtectedRoute><Layout><ReportValidation /></Layout></ProtectedRoute>} />
        <Route path="/download" element={<ProtectedRoute><Layout><Download /></Layout></ProtectedRoute>} />

        {/* Admin Area */}
        <Route path="/konfigurasi" element={<ProtectedRoute adminOnly><Layout><Configuration /></Layout></ProtectedRoute>} />
        <Route path="/aktivasi" element={<ProtectedRoute adminOnly><Layout><UserActivation /></Layout></ProtectedRoute>} />

        {/* Pareto */}
        <Route path="/pareto" element={<ProtectedRoute><Layout><BreakdownParetoPage /></Layout></ProtectedRoute>} />

        {/* Backlog */}
        <Route path="/backlog/input" element={<ProtectedRoute><Layout><InputBacklog /></Layout></ProtectedRoute>} />
        <Route path="/backlog/validasi" element={<ProtectedRoute><Layout><BacklogValidation /></Layout></ProtectedRoute>} />
        <Route path="/backlog/review" element={<ProtectedRoute><Layout><BacklogReview /></Layout></ProtectedRoute>} />
        <Route path="/backlog/list" element={<ProtectedRoute><Layout><BacklogList /></Layout></ProtectedRoute>} />
        <Route path="/backlog/detail/:id" element={<ProtectedRoute><Layout><BacklogDetail /></Layout></ProtectedRoute>} />
        <Route path="/backlog/edit/:id" element={<ProtectedRoute><Layout><EditBacklog /></Layout></ProtectedRoute>} />
        <Route path="/backlog/review/:id" element={<ProtectedRoute><Layout><PlannerReviewDetail /></Layout></ProtectedRoute>} />
        <Route path="/supply/backlog" element={<ProtectedRoute><Layout><SupplyList /></Layout></ProtectedRoute>} />
        <Route path="/supply/backlog/:id" element={<ProtectedRoute><Layout><SupplyDetail /></Layout></ProtectedRoute>} />
        <Route path="/backlog/dashboard" element={<ProtectedRoute><Layout><BacklogDashboard /></Layout></ProtectedRoute>} />
        <Route path="/backlog/scheduling" element={<ProtectedRoute><Layout><BacklogScheduling /></Layout></ProtectedRoute>} />
        <Route path="/backlog/work-schedule" element={<ProtectedRoute><Layout><WorkSchedule /></Layout></ProtectedRoute>} />
        <Route path="/backlog/shutdown-planner" element={<ProtectedRoute><Layout><ShutdownPlanner /></Layout></ProtectedRoute>} />

        {/* Notifications */}
        <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />

        {/* Operational */}
        <Route path="/operational/energy-input" element={<ProtectedRoute><Layout><EnergyInput /></Layout></ProtectedRoute>} />
        <Route path="/operational/energy-monitoring" element={<ProtectedRoute><Layout><EnergyMonitoring /></Layout></ProtectedRoute>} />

        <Route path="/toolroom/*" element={<ProtectedRoute><Layout><ToolRoom /></Layout></ProtectedRoute>} />
        
        {/* ✅ Mine Maintenance Module */}
        <Route
          path="/mine-maintenance/*"
          element={
            <ProtectedRoute>
              <Layout>
                <MineRouter />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}


// ======================================================
// Main App
// ======================================================
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
