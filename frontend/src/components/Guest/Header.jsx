import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function Header() {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

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
                className="w-full pl-4 pr-12 py-2 rounded text-black bg-white focus:outline-none"
                placeholder="Tìm kiếm sản phẩm..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />

              {/* SEARCH BUTTON */}
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2
                           bg-orange-500 hover:bg-orange-600
                           text-white p-2 rounded"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* ACTION */}
          <div className="flex gap-3">
            <button className="bg-white text-orange-500 px-4 py-1 rounded hover:bg-gray-100"
            onClick={() => navigate("/login")}>
              Đăng nhập
            </button>
            <button className="border border-white px-4 py-1 rounded hover:bg-orange-600">
              Đăng ký
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
