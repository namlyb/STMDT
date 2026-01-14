import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { API_URL } from "../../config";

export default function Header() {
  const [keyword, setKeyword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();
  const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;


  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const acc = sessionStorage.getItem("account");

    if (token && acc) {
      setIsLoggedIn(true);
      setAccount(JSON.parse(acc));
    }
  }, []);

  const avatarUrl = account?.Avatar
      ? `${AVATAR_BASE}/${account.Avatar}`
      : `${AVATAR_BASE}/avtDf.png`;

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("account");
    navigate("/");
    window.location.reload(); // refresh lại UI
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="bg-orange-500 text-white">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="h-16 flex items-center justify-between">

          {/* LOGO */}
          <div
            className="text-2xl font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            ShopeeFake
          </div>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="w-1/2">
            <div className="relative">
              <input
                className="w-full pl-4 pr-12 py-2 rounded text-black bg-white"
                placeholder="Tìm kiếm sản phẩm..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-2 rounded"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* ACTION */}
          {!isLoggedIn ? (
            <div className="flex gap-3">
              <button
                className="bg-white text-orange-500 px-4 py-1 rounded"
                onClick={() => navigate("/login")}
              >
                Đăng nhập
              </button>
              <button
                className="border border-white px-4 py-1 rounded"
                onClick={() => navigate("/register")}
              >
                Đăng ký
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover border"
              />

              <span className="text-sm">{account?.Username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-white underline"
              >
                Logout
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
