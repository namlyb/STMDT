import { Navigate, Outlet } from "react-router-dom";

export default function BuyerGuard() {
  const roleId = Number(sessionStorage.getItem("roleId"));
  const token = sessionStorage.getItem("token");

  // chưa login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Tài khoản bị khóa
  // if (user.IsActive === false) {
  //   return <Navigate to="/login" replace />;
  // }

  // không phải buyer
  if (roleId !== 2) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
