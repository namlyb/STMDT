import { Navigate, Outlet } from "react-router-dom";

export default function SellerGuard () {
  const roleId = Number(sessionStorage.getItem("roleId"));
  const token = sessionStorage.getItem("token");

  // ❌ Chưa đăng nhập
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Tài khoản bị khóa
  // if (account.IsActive === false) {
  //   sessionStorage.clear();
  //   return <Navigate to="/login" replace />;
  // }

  // ❌ Không phải người bán
  if (roleId !== 3) {
    return <Navigate to="/" replace />;
  }

  // ✅ Được phép
  return <Outlet />;
}
