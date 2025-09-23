import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Usage: <RoleRoute allow={['admin']}>...</RoleRoute>
export default function RoleRoute({ allow = [], children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (!allow.includes(user.role)) {
    // redirect by role
    const fallback = user.role === "admin"
      ? "/dashboard"
      : user.role === "vet"
      ? "/vet-dashboard"
      : "/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return children;
}
