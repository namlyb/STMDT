import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/header";
import Footer from "../../components/Guest/footer";

export default function Search() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const keyword = searchParams.get("keyword");

  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    axios.get("/products/search", {
      params: { category, keyword }
    })
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
      default: // newest
        return list.sort((a, b) => b.ProductId - a.ProductId);
    }
  }, [products, sort]);

  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4">

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
          </select>
        </div>

        {/* PRODUCT LIST */}
        {sortedProducts.length === 0 ? (
          <p className="text-gray-500 text-center">
            Không có sản phẩm
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {sortedProducts.map(p => (
              <div
                key={p.ProductId}
                className="bg-white p-3 rounded shadow hover:shadow-lg transition"
              >
                <img
                  src={p.Image}
                  alt=""
                  className="h-40 w-full object-cover mb-2 rounded"
                />

                <p className="text-sm line-clamp-2 mb-1">
                  {p.ProductName}
                </p>

                <p className="text-red-500 font-bold">
                  {Number(p.Price).toLocaleString()} ₫
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
