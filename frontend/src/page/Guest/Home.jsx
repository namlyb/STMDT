import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/Footer";
import axios from "../../components/lib/axios";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import canChat from "../../utils/canChat";

export default function Home() {
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState([]);
  const [voucherIndex, setVoucherIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [ad, setAd] = useState(null);

  const sliderRef = useRef(null);
  const [maxTranslate, setMaxTranslate] = useState(0);

  /* ================= CONSTANT ================= */
  const VOUCHER_WIDTH = 240; // 220px + gap

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    axios.get("/categories")
      .then(res => setCategories(res.data))
      .catch(console.error);

    axios.get("/products/random")
      .then(res => setProducts(res.data))
      .catch(console.error);

    axios.get("/ads/style/2")
      .then(res => setAd(res.data))
      .catch(console.error);

    axios.get("/vouchers/random?limit=8")
      .then(res => {
        console.log("voucher api =", res.data);
        if (Array.isArray(res.data)) {
          setVouchers(res.data);
        } else {
          setVouchers([]);
        }
      })
      .catch(console.error);
  }, []);

  /* ================= CALC SLIDER ================= */
  useEffect(() => {
    if (!sliderRef.current || vouchers.length === 0) return;

    const containerWidth = sliderRef.current.offsetWidth;
    const totalWidth = vouchers.length * VOUCHER_WIDTH;

    const max = Math.max(totalWidth - containerWidth, 0);
    setMaxTranslate(max);
  }, [vouchers]);

  const translateX = Math.min(voucherIndex * VOUCHER_WIDTH, maxTranslate);

  const getVoucherBtnClass = (v) => {
    if (v.isOut) return "bg-gray-300 text-gray-500 cursor-not-allowed";
    if (v.isReceived) return "bg-gray-400 text-white cursor-not-allowed";
    return "bg-orange-500 hover:bg-orange-600 text-white";
  };

  const handleSaveVoucher = async (voucherId) => {
    try {
      await axios.post("/voucher-usage/save", { voucherId });
      setVouchers(prev =>
        prev.map(v =>
          v.VoucherId === voucherId
            ? { ...v, isReceived: 1, Quantity: v.Quantity - 1 }
            : v
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi");
    }
  };

  return (
    <>
      {/* ================= HEADER ================= */}
      <Header />

      {/* ================= MAIN ================= */}
      <main className="bg-gray-50 py-6">
        <div className="grid grid-cols-12 max-w-7xl mx-auto px-4 gap-4">

          {/* ===== LEFT SIDEBAR ===== */}
          <aside className="col-span-2">
            <div
              className="bg-white p-2 rounded shadow
                         max-h-[calc(100vh-120px)]
                         overflow-y-auto
                         sticky top-24"
            >
              <h3 className="font-bold mb-2">Danh mục</h3>

              <ul className="space-y-2 text-sm">
                {categories.map(cat => (
                  <li
                    key={cat.CategoryId}
                    onClick={() =>
                      navigate(`/search?category=${cat.CategoryId}`)
                    }
                    className="flex items-center gap-2
                               cursor-pointer
                               hover:text-orange-500"
                  >
                    {cat.CategoryImage && (
                      <img
                        src={cat.CategoryImage}
                        alt=""
                        className="w-5 h-5 object-cover"
                      />
                    )}
                    {cat.CategoryName}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <section className="col-span-8">
            <h2 className="text-xl font-bold mb-4">Gợi ý hôm nay</h2>

            <div className="grid grid-cols-4 gap-4">
              {products.map(product => (
                <div
                  key={product.ProductId}
                  onClick={() =>
                    navigate(`/product/${product.ProductId}`)
                  }
                  className="bg-white p-3 rounded shadow
                             hover:shadow-lg transition
                             cursor-pointer"
                >
                  <img
                    src={product.Image}
                    alt=""
                    className="h-32 w-full object-cover mb-2"
                  />

                  <p className="text-sm line-clamp-2">
                    {product.ProductName}
                  </p>

                  <p className="text-red-500 font-bold">
                    {Number(product.Price).toLocaleString()} ₫
                  </p>
                  {/* View Details Button */}
                    <button className="mt-4 w-full py-2 bg-gray-50 text-gray-700 cursor-pointer rounded-lg font-medium hover:bg-orange-50 hover:text-orange-600 transition-colors text-sm">
                      Xem chi tiết
                    </button>
                </div>
                
              ))}
            </div>

            {/* ================= VOUCHER SLIDER ================= */}
            <div className="mt-8 relative group">
              <h3 className="text-lg font-bold mb-3">🎁 Voucher nổi bật</h3>

              {/* Nút trái */}
              {voucherIndex > 0 && (
                <button
                  onClick={() => setVoucherIndex(voucherIndex - 1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2
                             bg-white shadow rounded-full w-8 h-8
                             hidden group-hover:flex
                             items-center justify-center z-10 cursor-pointer"
                >
                  ◀
                </button>
              )}

              {/* List voucher */}
              <div className="overflow-hidden" ref={sliderRef}>
                <div
                  className="flex gap-4 transition-transform duration-300"
                  style={{
                    transform: `translateX(-${translateX}px)`
                  }}
                >
                  {vouchers.map(v => (
                    <div
                      key={v.VoucherId}
                      className="w-[220px] shrink-0 bg-white border rounded-lg p-3 shadow-sm"
                    >
                      <p className="font-semibold text-sm line-clamp-2">
                        {v.VoucherName}
                      </p>

                      <p className="text-red-500 font-bold mt-1">
                        {v.DiscountType === "percent"
                          ? `Giảm ${v.DiscountValue}%`
                          : `Giảm ${Number(v.DiscountValue).toLocaleString()} ₫`}

                      </p>

                      {v.MinOrderValue > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Đơn từ {Number(v.MinOrderValue).toLocaleString()}đ
                        </p>
                      )}
                      {v.MaxDiscount > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Tối đa {Number(v.MaxDiscount).toLocaleString()}đ
                        </p>
                      )}


                      <p className="text-xs text-gray-500 mt-1 italic">
                        {v.StallName
                          ? `Áp dụng cho gian hàng "${v.StallName}"`
                          : "Áp dụng cho tất cả mặt hàng"}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        HSD: {v.EndTime}
                      </p>

                      <button
                        disabled={v.isReceived || v.isOut}
                        onClick={() => handleSaveVoucher(v.VoucherId)}
                        className={`mt-2 w-full text-sm rounded py-1 transition
    ${getVoucherBtnClass(v)}
  `}
                      >
                        {v.isOut ? "Hết lượt" : v.isReceived ? "Đã nhận" : "Lưu voucher"}
                      </button>

                    </div>
                  ))}
                </div>
              </div>

              {/* Nút phải */}
              {voucherIndex * VOUCHER_WIDTH < maxTranslate && (
                <button
                  onClick={() => setVoucherIndex(voucherIndex + 1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2
                             bg-white shadow rounded-full w-8 h-8
                             hidden group-hover:flex
                             items-center justify-center z-10 cursor-pointer"
                >
                  ▶
                </button>
              )}
            </div>
          </section>

          {/* ===== RIGHT SIDEBAR ===== */}
          <aside className="col-span-2">
            <div className="bg-white rounded shadow sticky top-24 overflow-hidden">
              {ad ? (
                <img
                  src={ad.AdsImage}
                  alt="Quảng cáo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="p-4 text-sm text-gray-400 text-center">
                  Chưa có quảng cáo,
                  liên hệ ngay ở góc dưới cùng màn hình để được hỗ trợ!
                </p>
              )}
            </div>
          </aside>

        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <Footer />

      {/* ================= CHAT ================= */}
      {canChat() && <ChatBubble sellerId={null} />}
    </>
  );
}
