import { Navigate, Outlet } from "react-router-dom";

const StaffGuard = () => {
  const roleId = Number(sessionStorage.getItem("roleId"));
  const token = sessionStorage.getItem("token");

  // Kiểm tra đăng nhập
  if (!token) {
    console.log("StaffGuard - No token found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra role (Staff có RoleId = 4)
  if (roleId !== 4) {
    console.log(`StaffGuard - Invalid role: ${roleId}, required: 4, redirecting to home`);
    return <Navigate to="/" replace />;
  }

  console.log("StaffGuard - Access granted for staff");
  return <Outlet />;
};

export default StaffGuard;