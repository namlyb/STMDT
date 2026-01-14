// src/components/Admin/AdminLayout.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiLogOut,
  FiHome,
  FiUsers,
  FiBox,
  FiShoppingCart,
  FiTag,
  FiLayers,
} from "react-icons/fi";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Menu items
  const menuItems = [
    { name: "Dashboard", url: "#", icon: <FiHome /> },
    { name: "Accounts", url: "/admin/accounts", icon: <FiUsers /> },
    { name: "Products", url: "/admin/products", icon: <FiBox /> },
    { name: "Orders", url: "#", icon: <FiShoppingCart /> },
    { name: "Categories", url: "#", icon: <FiLayers /> },
    { name: "Promotions", url: "#", icon: <FiTag /> },
  ];

  // Logout: xóa sessionStorage và chuyển hướng về Home
  const handleLogout = () => {
    sessionStorage.clear(); // xóa tất cả dữ liệu trong sessionStorage
    // Nếu có token trong localStorage: localStorage.removeItem("token");

    navigate("/"); // redirect về home.jsx
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-orange-400 text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between p-4">
          {sidebarOpen && <h1 className="font-bold text-lg">Admin</h1>}
          <button
            onClick={toggleSidebar}
            className="text-white cursor-pointer"
            title={sidebarOpen ? "Thu nhỏ menu" : "Mở rộng menu"}
          >
            <FiMenu size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 mt-4">
          <ul className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <li
                key={item.name}
                onClick={() => navigate(item.url)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-orange-500 rounded cursor-pointer transition-colors"
                title={sidebarOpen ? "" : item.name}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && <span>{item.name}</span>}
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-orange-400 hover:bg-orange-500 rounded transition-colors cursor-pointer"
          >
            <FiLogOut />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">{children}</div>
    </div>
  );
};

export default AdminLayout;
