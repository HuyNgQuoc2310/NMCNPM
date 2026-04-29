import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import ReservationsPage from "./pages/ReservationsPage";
import SessionsPage from "./pages/SessionsPage";
import TablesPage from "./pages/TablesPage";
import BestSellingItemsReportPage from "./pages/reports/BestSellingItemsReportPage";
import HourlyGuestReportPage from "./pages/reports/HourlyGuestReportPage";
import MonthlyRevenueReportPage from "./pages/reports/MonthlyRevenueReportPage";

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

function AdminOnlyRoute() {
  return <ProtectedRoute roles={["admin"]} />;
}

function PublicOnlyLogin() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="screen-state">Đang tải phiên đăng nhập...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyLogin />} />
      <Route
        path="/forbidden"
        element={
          <ProtectedRoute>
            <ForbiddenPage />
          </ProtectedRoute>
        }
      />

      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />

        <Route element={<AdminOnlyRoute />}>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/best-selling-items" element={<BestSellingItemsReportPage />} />
          <Route path="/reports/hourly-guests" element={<HourlyGuestReportPage />} />
          <Route path="/reports/monthly-revenue" element={<MonthlyRevenueReportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
