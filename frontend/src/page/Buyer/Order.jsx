import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import { useNavigate } from "react-router-dom";

export default function Order() {
  const [cartItems, setCartItems] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const navigate = useNavigate();
  const total = cartItems.reduce((sum, i) => sum + i.UnitPrice * i.Quantity, 0);
  const discount = selectedVoucher ? selectedVoucher.Discount : 0;
  const finalTotal = total - discount;
  
  useEffect(() => {

    const cartIds = JSON.parse(sessionStorage.getItem("checkoutCart"));
    if (!cartIds || cartIds.length === 0) return;

    axios.post("/orders/checkout", { cartIds })
      .then(res => {
        setCartItems(res.data.cartItems);
        setVouchers(res.data.vouchers);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");

    if (roleId !== "2") {
      alert("Bạn không có quyền truy cập");
      navigate("/");
    }
  }, [navigate]);


  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Thanh toán</h2>

      <div>
        {cartItems.map(item => (
          <div key={item.CartId} className="flex justify-between border-b py-2">
            <span>{item.ProductName} x {item.Quantity}</span>
            <span>{(item.UnitPrice * item.Quantity).toLocaleString()} ₫</span>
          </div>
        ))}
      </div>

      <div className="my-4">
        <label>Voucher:</label>
        <select
          value={selectedVoucher?.VoucherId || ""}
          onChange={e => {
            const v = vouchers.find(v => v.VoucherId === +e.target.value);
            setSelectedVoucher(v || null);
          }}
          className="border px-2 py-1"
        >
          <option value="">Chọn voucher</option>
          {vouchers.map(v => (
            <option key={v.VoucherId} value={v.VoucherId}>
              {v.VoucherName} - Giảm {v.Discount} ₫
            </option>
          ))}
        </select>
      </div>

      <div className="text-right font-bold text-red-500 text-lg">
        Tổng: {finalTotal.toLocaleString()} ₫
      </div>

      <button className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg">
        Thanh toán
      </button>
    </div>
  );
}
