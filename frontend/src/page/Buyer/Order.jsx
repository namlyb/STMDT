import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";

export default function Order() {
  const navigate = useNavigate();
  const location = useLocation();

  /* ================= INIT ================= */
  const cartIds =
    location.state?.cartIds ||
    JSON.parse(sessionStorage.getItem("checkoutCartIds")) ||
    [];

  const isBuyNow = location.state?.buyNow;
  const buyNowProductId = location.state?.productId;
  const buyNowQuantity = location.state?.quantity;

  /* ================= STATE ================= */
  const [items, setItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [shipTypes, setShipTypes] = useState([]);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipType, setSelectedShipType] = useState(null);

  const [orderVoucher, setOrderVoucher] = useState(null);
  const [orderVouchers, setOrderVouchers] = useState([]);

  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const account = JSON.parse(sessionStorage.getItem("account"));
        if (!account) return navigate("/login");

        const checkoutRes = isBuyNow
          ? await axios.post("/orders/checkout/buynow", {
            productId: buyNowProductId,
            quantity: buyNowQuantity,
          })
          : await axios.post("/orders/checkout", { cartIds });

        const [addrRes, shipRes, voucherRes] = await Promise.all([
          axios.get(`/addresses/account/${account.AccountId}`),
          axios.get("/shiptypes"),
          axios.get(`/voucher-usage/account/${account.AccountId}`),
        ]);

        setItems(
          checkoutRes.data.items.map(i => ({
            ...i,
            selectedVoucher: null,
            vouchers: (i.vouchers || []).filter(v =>
              (v.CreatedBy === 1 || v.StallId === i.StallId) &&
              v.DiscountType !== "ship"
            ),
          }))
        );

        setOrderVouchers(
          (voucherRes.data || []).filter(v => v.CreatedBy === 1)
        );

        setAddresses(addrRes.data || []);
        setShipTypes(shipRes.data || []);

        if (addrRes.data?.length) setSelectedAddress(addrRes.data[0]);
        if (shipRes.data?.length) setSelectedShipType(shipRes.data[0]);

        setLoading(false);
      } catch (err) {
        console.error(err);
        alert("Không thể checkout");
        navigate("/cart");
      }
    };

    fetchData();
  }, []);

  /* ================= FORMAT ================= */
  const fmt = n => Number(n || 0).toLocaleString("vi-VN");

  /* ================= ITEM PRICE ================= */
  const calcItemDiscount = item => {
    const v = item.selectedVoucher;
    if (!v) return 0;
    if (item.totalPrice < v.MinOrderValue) return 0;

    let d = 0;
    if (v.DiscountType === "percent") {
      d = Math.floor(item.totalPrice * v.DiscountValue / 100);
      if (v.MaxDiscount) d = Math.min(d, v.MaxDiscount);
    } else {
      d = v.DiscountValue;
    }

    return Math.min(d, item.totalPrice);
  };

  const calcItemFinal = item =>
    Math.max(item.totalPrice - calcItemDiscount(item), 0);

  /* ================= TOTAL ================= */
  const productTotal = items.reduce((s, i) => s + calcItemFinal(i), 0);
  const shipFee = selectedShipType?.ShipFee || 0;

  const orderVoucherDiscount = (() => {
    if (!orderVoucher) return { product: 0, ship: 0 };
    if (productTotal < orderVoucher.MinOrderValue) return { product: 0, ship: 0 };

    if (orderVoucher.DiscountType === "ship") {
      return { product: 0, ship: Math.min(shipFee, orderVoucher.DiscountValue) };
    }

    let d = orderVoucher.DiscountType === "percent"
      ? Math.floor(productTotal * orderVoucher.DiscountValue / 100)
      : orderVoucher.DiscountValue;

    if (orderVoucher.MaxDiscount) d = Math.min(d, orderVoucher.MaxDiscount);

    return { product: Math.min(d, productTotal), ship: 0 };
  })();

  const grandTotal =
    productTotal -
    orderVoucherDiscount.product +
    (shipFee - orderVoucherDiscount.ship);

  if (loading) return <p className="text-center mt-10">Đang tải...</p>;

  /* ================= RENDER ================= */
  return (
    <>
      <Header />

      <div className="bg-gray-100 py-8">
        <form className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

          {/* ADDRESS */}
          <section className="p-6 border-b bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
              📍 Địa chỉ nhận hàng
            </h3>

            <div className="relative">
              {/* Card hiển thị địa chỉ đang chọn */}
              <div className="
      p-4 bg-white border rounded-lg cursor-pointer
      hover:border-orange-400 transition
    ">
                {selectedAddress ? (
                  <>
                    <p className="font-semibold text-gray-800">
                      {selectedAddress.Name}
                      <span className="ml-2 text-sm text-gray-500">
                        | {selectedAddress.Phone}
                      </span>
                    </p>
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {selectedAddress.Content}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">Chọn địa chỉ nhận hàng</p>
                )}
              </div>

              {/* Select phủ lên card */}
              <select
                className="
        absolute inset-0 opacity-0 cursor-pointer
      "
                value={selectedAddress?.AddressId || ""}
                onChange={e =>
                  setSelectedAddress(
                    addresses.find(a => a.AddressId === Number(e.target.value))
                  )
                }
              >
                {addresses.map(a => (
                  <option key={a.AddressId} value={a.AddressId}>
                    {a.Name} | {a.Phone} | {a.Content}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ITEMS */}
          <section className="p-6 space-y-6">
            {items.map(item => (
              <div key={item.CartId ?? item.ProductId} className="flex gap-4">
                <img src={item.Image} className="w-24 h-24 rounded-lg" />

                <div className="flex-1">
                  <h4 className="font-medium">{item.ProductName}</h4>
                  <p className="text-sm text-gray-500">SL: {item.Quantity}</p>
                  <p className="text-sm text-gray-500">Giá: {fmt(item.UnitPrice)}</p>
                  <select
                    className="mt-2 w-full p-2 text-sm rounded-md border border-gray-300"
                    value={item.selectedVoucher?.UsageId || ""}
                    onChange={e => {
                      const v = item.vouchers.find(
                        x => x.UsageId === Number(e.target.value)
                      );
                      setItems(prev =>
                        prev.map(i =>
                          i === item ? { ...i, selectedVoucher: v || null } : i
                        )
                      );
                    }}
                  >
                    <option value="">🎟️ Voucher sản phẩm</option>
                    {item.vouchers.map(v => (
                      <option
                        key={v.UsageId}
                        value={v.UsageId}
                        disabled={item.totalPrice < v.MinOrderValue}
                      >
                        {v.VoucherName} (
                        {v.DiscountType === "percent"
                          ? `Giảm ${v.DiscountValue}% - tối đa ${fmt(v.MaxDiscount)}đ ${v.MinOrderValue === 0 ? "" : `cho đơn hàng từ ${fmt(v.MinOrderValue)}đ`}`
                          : `Giảm ${fmt(v.DiscountValue)}đ ${v.MinOrderValue === 0 ? "" : `cho đơn hàng từ ${fmt(v.MinOrderValue)}đ`}`
                        }
                        )

                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-right font-semibold text-red-500 text-lg">
                  {fmt(calcItemFinal(item))}đ
                </div>
              </div>
            ))}
          </section>

          {/* ORDER VOUCHER */}
          <section className="p-6">
            <h3 className="font-semibold mb-2">🎫 Voucher toàn đơn</h3>

            <select
              className="w-full p-3 rounded-lg border border-gray-300"
              value={orderVoucher?.UsageId || ""}
              onChange={e =>
                setOrderVoucher(
                  orderVouchers.find(v => v.UsageId === Number(e.target.value)) || null
                )
              }
            >
              <option value="">Không dùng</option>
              {orderVouchers.map(v => (
                <option
                  key={v.UsageId}
                  value={v.UsageId}
                  disabled={productTotal < v.MinOrderValue}
                >
                  {v.VoucherName} (
                  {v.DiscountType === "percent"
                    ? `Giảm ${v.DiscountValue}% - tối đa ${fmt(v.MaxDiscount)}đ ${v.MinOrderValue === 0 ? "" : `cho đơn hàng từ ${fmt(v.MinOrderValue)}đ`}`
                    : `Giảm ${fmt(v.DiscountValue)}đ ${v.MinOrderValue === 0 ? "" : `cho đơn hàng từ ${fmt(v.MinOrderValue)}đ`}`
                  }
                  )

                </option>
              ))}
            </select>
          </section>

          {/* SHIP */}
          <section className="p-6">
            <h3 className="font-semibold mb-2">🚚 Vận chuyển</h3>
            <select
              className="w-full p-3 rounded-lg border border-gray-300"
              value={selectedShipType?.ShipTypeId || ""}
              onChange={e =>
                setSelectedShipType(
                  shipTypes.find(s => s.ShipTypeId === Number(e.target.value))
                )
              }
            >
              {shipTypes.map(s => (
                <option key={s.ShipTypeId} value={s.ShipTypeId}>
                  {s.Content} (+{fmt(s.ShipFee)}đ)
                </option>
              ))}
            </select>
          </section>

          {/* TOTAL */}
          <section className="p-6 border-t bg-gray-50">
            <div className="text-right text-sm space-y-1">
              <p>Tiền hàng: {fmt(productTotal)}đ</p>
              <p>Phí ship: {fmt(shipFee)}đ</p>
              {orderVoucherDiscount.product > 0 && (
                <p className="text-green-600">
                  Giảm đơn: -{fmt(orderVoucherDiscount.product)}đ
                </p>
              )}
              {orderVoucherDiscount.ship > 0 && (
                <p className="text-green-600">
                  Giảm ship: -{fmt(orderVoucherDiscount.ship)}đ
                </p>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <span className="text-lg font-semibold">Tổng thanh toán</span>
              <span className="text-2xl font-bold text-red-500">
                {fmt(grandTotal)}đ
              </span>
            </div>

            <button
              type="button"
              className="w-full mt-4 py-3 bg-orange-500 cursor-pointer text-white rounded-lg"
            >
              Đặt hàng
            </button>
          </section>
        </form>
      </div>

      <Footer />
    </>
  );
}
