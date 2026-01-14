import { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../config";
import AdminLayout from "../../components/Admin/Sidebar.jsx";

function ListProduct() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 filter + search
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  // 📄 pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Products API error:", data);
          setProducts([]); // ✅ fallback
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setProducts([]); // ✅ fallback
        setLoading(false);
      });

    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      });
  }, []);


  // 🔥 Toggle Active
  const toggleActive = async (productId, currentStatus) => {
    try {
      const res = await fetch(
        `${API_URL}/api/products/${productId}/active`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            isActive: currentStatus ? 0 : 1
          })
        }
      );

      if (!res.ok) throw new Error("Update failed");

      // update UI
      setProducts(prev =>
        prev.map(p =>
          p.ProductId === productId
            ? { ...p, IsActive: currentStatus ? 0 : 1 }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật trạng thái");
    }
  };

  // reset page khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  const formatPrice = (price) =>
    Number(price).toLocaleString("vi-VN") + " ₫";

  // 🔍 FILTER + SEARCH
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    const keyword = search.toLowerCase().trim();

    return products.filter(p => {
      const matchSearch =
        p.ProductName?.toLowerCase().includes(keyword) ||
        p.StallName?.toLowerCase().includes(keyword);

      const matchCategory = category
        ? p.CategoryName === category
        : true;

      const matchStatus =
        status === ""
          ? true
          : Number(p.Status) === Number(status);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, category, status]);


  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const pagedData = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading) return <p>Đang tải dữ liệu...</p>;

  return (
    <AdminLayout>
      <div className="bg-white rounded-xl shadow p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-orange-600">
            📦 Quản lý sản phẩm
          </h2>
        </div>

        {/* FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="🔍 Tìm tên sản phẩm / gian hàng"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 cursor-pointer"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">📂 Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c.CategoryId} value={c.CategoryName}>
                {c.CategoryName}
              </option>
            ))}
          </select>


          <select
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 cursor-pointer"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">📌 Tất cả trạng thái</option>
            <option value="1">✔ Đang bán</option>
            <option value="0">✖ Ngừng bán</option>
          </select>


          <div className="flex items-center text-sm text-gray-500">
            Tổng: <span className="ml-1 font-semibold text-orange-500">
              {filteredProducts.length}
            </span> sản phẩm
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-4 py-3 text-center">Sản phẩm</th>
                <th className="px-4 py-3 text-center">Danh mục</th>
                <th className="px-4 py-3 text-center">Gian hàng</th>
                <th className="px-4 py-3 text-center">Giá</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                pagedData.map(p => (
                  <tr
                    key={p.ProductId}
                    className="border-b hover:bg-orange-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.ProductName}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {p.Description}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="grid grid-cols-4">
                        <div></div> {/* col 1 trống */}
                        <div className="col-span-3 font-medium text-gray-700">
                          {p.CategoryName}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">{p.StallName}</td>

                    <td className="px-4 py-3">
                      <div className="grid grid-cols-4">
                        <div className="col-span-3 text-right font-semibold text-orange-600">
                          {formatPrice(p.Price)}
                        </div>
                        <div></div> {/* col 4 trống */}
                      </div>
                    </td>


                    <td className="px-4 py-3 text-center">
                      {p.Status ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 text-center">
                          ✔ Đang bán
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600 text-center">
                          ✖ Ngừng bán
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p.ProductId, p.IsActive)}
                        className={`px-3 py-1 text-xs rounded text-white transition cursor-pointer ${p.IsActive
                          ? "bg-green-600 hover:bg-red-600"
                          : "bg-red-500 hover:bg-green-600"
                          }`}
                      >
                        {p.IsActive ? "Cấm bán" : "Bỏ cấm"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-6">

          {/* PREV */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`
      flex items-center gap-2 px-4 py-2 rounded-full border
      transition-all duration-200
      ${page === 1
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
    `}
          >
            <span className="text-lg">←</span>
            <span className="text-sm font-medium">Trước</span>
          </button>

          {/* PAGE NUMBER */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`
          w-9 h-9 rounded-full text-sm font-semibold
          transition-all duration-200
          ${page === i + 1
                    ? "bg-orange-300 text-white shadow"
                    : "bg-orange-50 text-orange-500 hover:bg-orange-200 cursor-pointer"}
        `}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* NEXT */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className={`
      flex items-center gap-2 px-4 py-2 rounded-full border
      transition-all duration-200
      ${page === totalPages || totalPages === 0
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm  cursor-pointer"}
    `}
          >
            <span className="text-sm font-medium">Sau</span>
            <span className="text-lg">→</span>
          </button>

        </div>

      </div>
    </AdminLayout>
  );
}

export default ListProduct;
