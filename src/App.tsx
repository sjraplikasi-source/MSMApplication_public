// =============================
// src/App.tsx
// =============================

import HomePage from './pages/HomePage';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import RegisterUser from './pages/RegisterUser';
import Dashboard from './pages/Dashboard';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';
import ReportForm from './pages/ReportForm';
import ReportValidation from './pages/ReportValidation';
import Download from './pages/Download';
import Configuration from './pages/Configuration';
import UserActivation from './pages/UserActivation';
import { useAuth } from './context/AuthContext';
import BreakdownParetoPage from './pages/BreakdownParetoPage';
import ReportEdit from "./pages/ReportEdit";
import InputBacklog from "./pages/Backlog/BacklogForm";
import BacklogValidation from "./pages/Backlog/BacklogValidation";
import BacklogReview from "./pages/Backlog/BacklogReview";
import BacklogList from './pages/Backlog/BacklogList';
import BacklogDetail from './pages/Backlog/BacklogDetail';
import EditBacklog from './pages/Backlog/EditBacklog';
import PlannerReviewDetail from './pages/Backlog/PlannerReviewDetail';
import SupplyList from "@/pages/Backlog/SupplyList";
import SupplyDetail from "@/pages/Backlog/SupplyDetail";
import NotificationsPage from "@/pages/Notifications";
import BacklogDashboard from "@/pages/Backlog/BacklogDashboard";
import BacklogScheduling from "./pages/Backlog/BacklogScheduling";
import WorkSchedule from "./pages/Backlog/WorkSchedule";
import ShutdownPlanner from "./pages/Backlog/ShutdownPlanner";
import EnergyInput from "./pages/Operational/EnergyInput";
import EnergyMonitoring from "./pages/Operational/EnergyMonitoring";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  // Jangan render apa pun selama loading
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="text-gray-500">Memuat sesi pengguna...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Layout><RegisterUser /></Layout>} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />
      
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Layout><ReportList /></Layout></ProtectedRoute>} />
      <Route path="/reports/new" element={<ProtectedRoute><Layout><ReportForm /></Layout></ProtectedRoute>} />
      <Route path="/reports/edit/:id" element={<ProtectedRoute><Layout><ReportForm /></Layout></ProtectedRoute>} />
      <Route path="/reports/:id" element={<ProtectedRoute><Layout><ReportDetail /></Layout></ProtectedRoute>} />
      <Route path="/validasi" element={<ProtectedRoute><Layout><ReportValidation /></Layout></ProtectedRoute>} />
      <Route path="/download" element={<ProtectedRoute><Layout><Download /></Layout></ProtectedRoute>} />
      <Route path="/konfigurasi" element={<ProtectedRoute adminOnly><Layout><Configuration /></Layout></ProtectedRoute>} />
      <Route path="/aktivasi" element={<ProtectedRoute adminOnly><Layout><UserActivation /></Layout></ProtectedRoute>} />
      <Route path="/pareto" element={<ProtectedRoute><Layout><BreakdownParetoPage /></Layout></ProtectedRoute>} />

      <Route path="/Backlog/input" element={<ProtectedRoute><Layout><InputBacklog /></Layout></ProtectedRoute>} />
      <Route path="/Backlog/validasi" element={<ProtectedRoute><Layout><BacklogValidation /></Layout></ProtectedRoute>} />
      <Route path="/Backlog/review" element={<ProtectedRoute><Layout><BacklogReview /></Layout></ProtectedRoute>} />
      <Route path="/Backlog/list" element={<ProtectedRoute><Layout><BacklogList /></Layout></ProtectedRoute>} />
      <Route path="/Backlog/detail/:id" element={<ProtectedRoute><Layout><BacklogDetail /></Layout></ProtectedRoute>} />
      <Route path="/backlog/edit/:id" element={<ProtectedRoute><Layout><EditBacklog /></Layout></ProtectedRoute>} />
      <Route path="/backlog/review/:id" element={<ProtectedRoute><Layout><PlannerReviewDetail /></Layout></ProtectedRoute>} />
      <Route path="/supply/backlog" element={<ProtectedRoute><Layout><SupplyList /></Layout></ProtectedRoute>} />
      <Route path="/supply/backlog/:id" element={<ProtectedRoute><Layout><SupplyDetail /></Layout></ProtectedRoute>} />
      <Route path="/backlog/dashboard" element={<ProtectedRoute><Layout><BacklogDashboard /></Layout></ProtectedRoute>} />
      <Route path="/backlog/shutdown-planner" element={<ProtectedRoute><Layout><ShutdownPlanner /></Layout></ProtectedRoute>} />
      <Route path="/backlog/work-schedule" element={<ProtectedRoute><Layout><WorkSchedule /></Layout></ProtectedRoute>} />
      <Route path="/backlog/scheduling" element={<ProtectedRoute><Layout><BacklogScheduling /></Layout></ProtectedRoute>} />
      
      <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />

      <Route path="/operational/energy-input" element={<ProtectedRoute><Layout><EnergyInput /></Layout></ProtectedRoute>} />

      <Route path="/operational/energy-monitoring" element={<ProtectedRoute><Layout><EnergyMonitoring /></Layout></ProtectedRoute>} />
      
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
