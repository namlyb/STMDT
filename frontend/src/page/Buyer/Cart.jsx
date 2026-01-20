import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import { useNavigate } from "react-router-dom";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import canChat from "../../utils/canChat";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [account, setAccount] = useState(null);

  const navigate = useNavigate();

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const accStr = sessionStorage.getItem("account");

    // ❌ chưa login
    if (!accStr) {
      navigate("/login", { replace: true });
      return;
    }

    const acc = JSON.parse(accStr);

    // ❌ admin không được vào cart
    if (String(acc.RoleId) === "1") {
      navigate("/admin/accounts", { replace: true });
      return;
    }

    // ✅ buyer
    setAccount(acc);
  }, [navigate]);

  /* ================= FETCH CART ================= */
  useEffect(() => {
    if (!account) return;

    axios
      .get("/carts")
      .then(res => setItems(res.data))
      .catch(console.error);
  }, [account]);

  /* ================= TOTAL (FE CHECKBOX) ================= */
  const total = items
    .filter(i => checkedItems.includes(i.CartId))
    .reduce((sum, i) => sum + i.UnitPrice * i.Quantity, 0);

  /* ================= QUANTITY ================= */
  const updateQty = async (item, qty) => {
    if (qty < 1) return;

    await axios.patch("/carts/quantity", {
      cartId: item.CartId,
      quantity: qty
    });

    setItems(prev =>
      prev.map(i =>
        i.CartId === item.CartId ? { ...i, Quantity: qty } : i
      )
    );
  };

  const onChangeQty = (item, value) => {
    if (!/^\d+$/.test(value)) return;
    updateQty(item, Number(value));
  };

  /* ================= DELETE ================= */
  const handleDelete = async (cartId) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    await axios.delete(`/carts/${cartId}`);

    setItems(prev => prev.filter(i => i.CartId !== cartId));
    setCheckedItems(prev => prev.filter(id => id !== cartId));
  };

  /* ================= CHECKBOX ================= */
  const isAllSelected =
    items.length > 0 && checkedItems.length === items.length;

  const handleSelectAll = (checked) => {
    setCheckedItems(
      checked ? items.map(i => i.CartId) : []
    );
  };

  /* ================= CHECKOUT ================= */
  const handleCheckout = async () => {
    if (checkedItems.length === 0) return;

    await axios.post("/orders/checkout", {
      cartIds: checkedItems
    });

    navigate("/buyer/checkout");
  };

  /* ================= RENDER ================= */
  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />

      <div className="max-w-5xl mx-auto mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">
          🛒 Giỏ hàng của {account?.Name}
        </h2>

        {items.length === 0 ? (
          <p className="text-gray-500">Giỏ hàng trống</p>
        ) : (
          <>
            {/* HEADER */}
            <div className="grid grid-cols-12 gap-4 items-center border-b pb-2 mb-2 text-sm font-semibold text-gray-600">
              <div className="col-span-1 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="cursor-pointer"
                />
              </div>
              <div className="col-span-4">Sản phẩm</div>
              <div className="col-span-3">Mô tả</div>
              <div className="col-span-1 text-center">SL</div>
              <div className="col-span-2 text-right">Giá</div>
              <div className="col-span-1"></div>
            </div>

            {items.map(item => (
              <div
                key={item.CartId}
                className="grid grid-cols-12 gap-4 items-center border-b py-4"
              >
                {/* CHECKBOX */}
                <div className="col-span-1 text-center">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={checkedItems.includes(item.CartId)}
                    onChange={(e) => {
                      setCheckedItems(prev =>
                        e.target.checked
                          ? [...prev, item.CartId]
                          : prev.filter(id => id !== item.CartId)
                      );
                    }}
                  />
                </div>

                {/* PRODUCT */}
                <div className="col-span-4 flex gap-3 cursor-pointer"
                  onClick={() => navigate(`/product/${item.ProductId}`)}>
                  <img
                    src={item.Image}

                    className="w-20 h-20 object-cover rounded "
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {item.ProductName}
                    </p>
                    <p className="text-red-500">
                      {Number(item.UnitPrice).toLocaleString()} ₫
                    </p>
                  </div>
                </div>

                {/* DESC */}
                <div className="col-span-3 text-sm text-gray-600">
                  {item.Description}
                </div>

                {/* QTY */}
                <div className="col-span-1 flex justify-center">
                  <div className="flex items-center">
                    <button
                      onClick={() => updateQty(item, item.Quantity - 1)}
                      className="w-7 border cursor-pointer"
                    >−</button>

                    <input
                      value={item.Quantity}
                      onChange={(e) => onChangeQty(item, e.target.value)}
                      className="w-10 text-center border"
                    />

                    <button
                      onClick={() => updateQty(item, item.Quantity + 1)}
                      className="w-7 border cursor-pointer"
                    >+</button>
                  </div>
                </div>

                {/* PRICE */}
                <div className="col-span-2 text-right font-bold text-red-500">
                  {(item.UnitPrice * item.Quantity).toLocaleString()} ₫
                </div>

                {/* DELETE */}
                <div className="col-span-1 text-right">
                  <button
                    onClick={() => handleDelete(item.CartId)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                  >✕</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* FOOTER */}
      {items.length > 0 && (
        <div className="
          max-w-5xl mx-auto
          sticky bottom-0
          bg-white
          shadow-[0_-12px_28px_rgba(0,0,0,0.28)]
          flex justify-between items-center
          px-6 py-4
          z-30
        ">
          <span className="text-xl font-bold text-red-500">
            Tổng: {total.toLocaleString()} ₫
          </span>

          <button
            disabled={checkedItems.length === 0}
            onClick={handleCheckout}
            className={`px-8 py-3 rounded-lg font-semibold text-white
              ${checkedItems.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 cursor-pointer"}
            `}
          >
            Thanh toán
          </button>
        </div>
      )}
      {canChat() && <ChatBubble sellerId={null} />}
    </div>
  );
}
