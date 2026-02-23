import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { label: "Thông tin cá nhân", path: "/profile" },
    { label: "Địa chỉ", path: "/address" },
    { label: "Đơn hàng", path: "/orders" },
    { label: "Kho voucher", path: "/my-voucher" },
  ];

  const account = JSON.parse(sessionStorage.getItem("account"));

  const getAvatarUrl = (avatar) => {
  if (!avatar) return "/uploads/AccountAvatar/avtDf.png";
  if (avatar.startsWith('http')) return avatar;
  if (avatar.startsWith('/uploads')) return avatar;
  return `/uploads/AccountAvatar/${avatar}`;
};

  return (
    <aside className="w-64 bg-white border rounded-lg p-4">
      {/* ACCOUNT INFO */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src={getAvatarUrl(account?.Avatar)}
          className="w-12 h-12 rounded-full object-cover border"
        />
        <div>
          <p className="font-semibold">{account?.Name}</p>
          <p className="text-sm text-gray-500">Tôi là {account?.Username}</p>
        </div>
      </div>

      {/* MENU */}
      <div className="space-y-2">
        {menu.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`cursor-pointer px-4 py-2 rounded 
              ${
                location.pathname === item.path
                  ? "bg-orange-500 text-white"
                  : "hover:bg-gray-100"
              }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
