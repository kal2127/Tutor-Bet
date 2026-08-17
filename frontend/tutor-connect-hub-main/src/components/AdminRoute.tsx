import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "@/lib/api";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const user = getCurrentUser();
  const location = useLocation();

  if (!user || user.role !== "ADMIN") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
