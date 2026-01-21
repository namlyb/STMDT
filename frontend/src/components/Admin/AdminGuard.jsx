import { Navigate, Outlet } from "react-router-dom";

export default function AdminGuard() {
  const roleId = Number(sessionStorage.getItem("roleId"));
  const token = sessionStorage.getItem("token");

  // chưa login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // không phải admin
  if (roleId !== 1) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
