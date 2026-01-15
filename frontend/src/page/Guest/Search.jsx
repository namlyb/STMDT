import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const category = searchParams.get("category");
  const keyword = searchParams.get("keyword");

  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    axios.get("/products/search", { params: { category, keyword } })
      .then(res => setProducts(res.data))
      .catch(console.error);
  }, [category, keyword]);

  /* ================= SORT LOGIC ================= */
const sortedProducts = useMemo(() => {
  const list = [...products];

  switch (sort) {
    case "priceAsc":
      return list.sort((a, b) => a.Price - b.Price);
    case "priceDesc":
      return list.sort((a, b) => b.Price - a.Price);
    case "bestSelling":
      return list.sort((a, b) => {
        if (b.countOrders === a.countOrders) {
          return b.ProductId - a.ProductId; // ID lớn hơn đứng trước nếu bằng count
        }
        return b.countOrders - a.countOrders; // số bán giảm dần
      });
    default: // newest
      return list.sort((a, b) => b.ProductId - a.ProductId);
  }
}, [products, sort]);


  return (
    <>
      <Header />
      <main className="bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4">

          {/* FILTER BAR */}
          <div className="bg-white p-3 rounded shadow mb-4 flex items-center gap-4">
            <span className="font-semibold">Sắp xếp theo:</span>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border px-3 py-1 rounded text-sm"
            >
              <option value="newest">Mới nhất</option>
              <option value="priceAsc">Giá: Thấp → Cao</option>
              <option value="priceDesc">Giá: Cao → Thấp</option>
              <option value="bestSelling">Bán chạy</option>
            </select>
          </div>

          {/* PRODUCT LIST */}
          {sortedProducts.length === 0 ? (
            <p className="text-gray-500 text-center">Không có sản phẩm</p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {sortedProducts.map(p => (
                <div
                  key={p.ProductId}
                  onClick={() => navigate(`/product/${p.ProductId}`)}
                  className="bg-white p-3 rounded shadow hover:shadow-lg transition cursor-pointer"
                >
                  <img
                    src={p.Image}
                    alt={p.ProductName}
                    className="h-32 w-full object-cover mb-2 rounded"
                  />
                  <p className="text-sm line-clamp-2 mb-1">{p.ProductName}</p>
                  <p className="text-red-500 font-bold">
                    {Number(p.Price).toLocaleString()} ₫
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
