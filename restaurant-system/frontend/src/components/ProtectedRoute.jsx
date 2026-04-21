import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div className="screen-state">Đang xác thực người dùng...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
