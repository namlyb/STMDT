import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../lib/axios";

export default function SellerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const [stallName, setStallName] = useState("");

  const menu = [
    { label: "Thông tin cá nhân", path: "/seller/profile" },
    { label: "Sản phẩm", path: "/seller/products" },
    { label: "Đơn hàng", path: "/seller/orders" },
    { label: "Khuyến mãi", path: "/seller/promotions" },

  ];

  useEffect(() => {
  const fetchStall = async () => {
    if (!account) return;
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`/stalls/account/${account.AccountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      //console.log("Fetch Stall:", res.data);
      setStallName(res.data?.StallName || "");
    } catch (err) {
      console.error("Fetch stall error:", err);
      setStallName("");
    }
  };
  fetchStall();
  // Chỉ chạy 1 lần khi mount
}, []);



  return (
    <aside className="w-60 bg-white border rounded-lg shadow-md p-4 flex-shrink-0 self-start">
      {/* Thông tin tài khoản */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <img
          src={
            account?.Avatar ||
            "http://localhost:8080/uploads/AccountAvatar/avtDf.png"
          }
          alt={account?.Name}
          className="w-12 h-12 rounded-full object-cover border"
        />
        <p className="font-semibold text-center">{account?.Name}</p>
        <p className="text-sm text-gray-500 text-center">
          Seller: {stallName || "..."}
        </p>
      </div>

      {/* Menu */}
      <div className="flex flex-col gap-2">
        {menu.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`cursor-pointer px-4 py-2 rounded 
              ${
                location.pathname === item.path
                  ? "bg-orange-500 text-white"
                  : "hover:bg-gray-100 transition"
              }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
