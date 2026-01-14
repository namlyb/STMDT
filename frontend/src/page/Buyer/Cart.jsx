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
                className="flex items-center gap-4 border-b py-3"
              >
                <img
                  src={item.Image}
                  alt=""
                  className="w-20 h-20 object-cover rounded"
                />

                <div className="flex-1">
                  <p className="font-semibold">{item.ProductName}</p>
                  <p className="text-red-500">
                    {Number(item.Price).toLocaleString()} ₫
                  </p>
                </div>

                <div className="w-20 text-center">
                  x{item.Quantity}
                </div>

                <div className="w-32 text-right font-bold">
                  {(item.Price * item.Quantity).toLocaleString()} ₫
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
