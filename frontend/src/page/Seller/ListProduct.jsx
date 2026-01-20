import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";

export default function SellerListProduct() {
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // CHECK ROLE
  useEffect(() => {
    if (!account || Number(account.RoleId) !== 3) {
      alert("Bạn không có quyền truy cập trang này!");
      navigate("/");
    }
  }, [account, navigate]);

  // LOAD PRODUCTS
  useEffect(() => {
    const fetchProducts = async () => {
      if (!account) return;
      try {
        const res = await axios.get(`/products/seller/${account.AccountId}`);
        setProducts(res.data);
      } catch (err) {
        console.error("Load seller products error:", err);
        alert("Lỗi khi tải sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [account]);

  const toggleStatus = async (productId, status) => {
    try {
      await axios.put(`/products/${productId}/status`, { status: !status });
      setProducts((prev) =>
        prev.map((p) => (p.ProductId === productId ? { ...p, Status: !status } : p))
      );
    } catch (err) {
      console.error("Toggle status error:", err);
      alert("Lỗi khi cập nhật trạng thái sản phẩm");
    }
  };

  if (loading) return <div className="p-4">Đang tải sản phẩm...</div>;
  if (products.length === 0) return <div className="p-4">Bạn chưa có sản phẩm nào.</div>;

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
        {/* Sidebar */}
        <SellerSidebar />

        {/* Content */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-4">Danh sách sản phẩm của bạn</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product.ProductId} className="bg-white shadow rounded p-3">
                <div className="relative w-full h-48 overflow-hidden rounded bg-gray-100 mb-2">
                  <img
                    src={product.Image}
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                    alt={product.ProductName}
                  />
                  <img
                    src={product.Image}
                    className="relative z-10 h-full mx-auto object-contain"
                    alt={product.ProductName}
                  />
                </div>
                <h2 className="text-lg font-semibold truncate">{product.ProductName}</h2>
                <p className="text-red-500 font-bold">{Number(product.Price).toLocaleString()} ₫</p>
                <p className="text-sm text-gray-500 truncate">{product.Description}</p>

                <div className="mt-2 flex justify-between items-center">
                  <span
                    className={`px-2 py-1 rounded text-white text-xs ${product.Status ? "bg-green-500" : "bg-gray-400"}`}
                  >
                    {product.Status ? "Đang bán" : "Ngừng bán"}
                  </span>
                  <button
                    onClick={() => toggleStatus(product.ProductId, product.Status)}
                    className="px-2 py-1 bg-orange-500 text-white rounded text-xs"
                  >
                    {product.Status ? "Tắt" : "Bật"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
