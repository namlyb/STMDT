import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";

export default function Cart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get("/carts")
      .then(res => setItems(res.data))
      .catch(err => console.error(err));
  }, []);

  const total = items.reduce(
    (sum, i) => sum + i.Price * i.Quantity,
    0
  );

  const handleDelete = async (cartId) => {
  if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?")) return;

  try {
    await axios.delete(`/carts/${cartId}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    });

    // Xóa local state luôn để UI cập nhật
    setItems(prev => prev.filter(item => item.CartId !== cartId));
  } catch (err) {
    console.error(err);
    alert("Xóa sản phẩm thất bại");
  }
};


  return (
    <>
      <Header />

      <div className="max-w-5xl mx-auto mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">🛒 Giỏ hàng</h2>

        {items.length === 0 ? (
          <p className="text-gray-500">Giỏ hàng trống</p>
        ) : (
          <>
            {items.map(item => (
              <div
                key={item.CartId}
                className="grid grid-cols-12 gap-4 items-center border-b py-4"
              >
                {/* ===== COL 1–4: IMAGE + NAME + PRICE ===== */}
                <div className="col-span-4 flex items-start gap-3 min-w-0">
                  <img
                    src={item.Image}
                    alt=""
                    className="w-20 h-20 object-cover rounded shrink-0"
                  />

                  <div className="min-w-0">
                    {/* ProductName: tối đa 2 dòng, nếu vượt hiển thị ... */}
                    <p className="font-semibold text-sm line-clamp-2 break-words">
                      {item.ProductName}
                    </p>

                    {/* Price */}
                    <p className="text-red-500 font-medium truncate">
                      {Number(item.Price).toLocaleString()} ₫
                    </p>
                  </div>
                </div>



                {/* ===== COL 5–7: DESCRIPTION ===== */}
                <div className="col-span-3 min-w-0">
                  <p className="text-gray-600 text-sm line-clamp-4 break-words">
                    {item.Description || "Không có mô tả"}
                  </p>
                </div>

                {/* ===== COL 8–9: QUANTITY ===== */}
                <div className="col-span-2 text-center">
                  x{item.Quantity}
                </div>

                {/* ===== COL 10–11: TOTAL PRICE ===== */}
                <div className="col-span-2 text-right font-bold text-red-500">
                  {(item.Price * item.Quantity).toLocaleString()} ₫
                </div>

                {/* ===== COL 12: DELETE ===== */}
                <div className="col-span-1 text-right">
                  <button
                    className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                    onClick={() => handleDelete(item.CartId)}
                    title="Xóa sản phẩm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <div className="text-right mt-4 text-xl font-bold text-red-500">
              Tổng: {total.toLocaleString()} ₫
            </div>
          </>
        )}
      </div>
    </>
  );
}
