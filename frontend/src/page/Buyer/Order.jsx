import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";

export default function Order() {
  const navigate = useNavigate();
  const location = useLocation();

  const cartIds =
    location.state?.cartIds ||
    JSON.parse(sessionStorage.getItem("checkoutCartIds")) ||
    [];

  const [items, setItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [shipTypes, setShipTypes] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipType, setSelectedShipType] = useState(null);

  const [orderVoucher, setOrderVoucher] = useState(null);
  const [orderVouchers, setOrderVouchers] = useState([]); // voucher admin
  const [loading, setLoading] = useState(true);

  const isBuyNow = location.state?.buyNow;
const buyNowProductId = location.state?.productId;
const buyNowQuantity = location.state?.quantity;


  // ================= FETCH =================

  

  useEffect(() => {
  const fetchData = async () => {
    try {
      const account = JSON.parse(sessionStorage.getItem("account"));
      if (!account) {
        navigate("/login");
        return;
      }

      let checkoutRes;

      if (isBuyNow) {
        checkoutRes = await axios.post(
          "/orders/checkout/buynow",
          {
            productId: buyNowProductId,
            quantity: buyNowQuantity,
          },
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
      } else {
        checkoutRes = await axios.post(
          "/orders/checkout",
          { cartIds },
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
          }
        );
      }

      const [addressRes, shipTypeRes, voucherRes] = await Promise.all([
        axios.get(`/addresses/account/${account.AccountId}`),
        axios.get("/shiptypes"),
        axios.get(`/voucher-usage/account/${account.AccountId}`),
      ]);

      setItems(
        checkoutRes.data.items.map(i => ({
          ...i,
          selectedVoucher: null,
        }))
      );

      setOrderVouchers(
        (voucherRes.data || []).filter(v => v.CreatedBy === 1)
      );

      setAddresses(addressRes.data || []);
      setShipTypes(shipTypeRes.data || []);

      if (addressRes.data?.length) setSelectedAddress(addressRes.data[0]);
      if (shipTypeRes.data?.length) setSelectedShipType(shipTypeRes.data[0]);

      setLoading(false);
    } catch (err) {
      console.error("CHECKOUT ERROR:", err);
      alert("Không thể tạo đơn hàng. Vui lòng thử lại.");
      navigate("/cart");
    }
  };

  fetchData();
}, []);


  // ================= VOUCHER STATE =================
  const usedVoucherUsageIds = items
    .map(i => i.selectedVoucher?.UsageId)
    .filter(Boolean);

  const orderVoucherUsageId = orderVoucher?.UsageId;

  // ================= PRICE =================
  const calcItemDiscount = (item) => {
    if (!item.selectedVoucher) return 0;

    let discount = 0;

    if (item.selectedVoucher.DiscountType === "percent") {
      discount = Math.floor(
        (item.totalPrice * item.selectedVoucher.Discount) / 100
      );
    } else {
      discount = item.selectedVoucher.Discount;
    }

    return Math.min(discount, item.totalPrice);
  };

  const calcItemTotal = (item) =>
    Math.max(item.totalPrice - calcItemDiscount(item), 0);

  const itemsTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const itemDiscountTotal = items.reduce(
    (s, i) => s + calcItemDiscount(i),
    0
  );

  const shippingFee = selectedShipType?.ShipFee || 0;

  const totalBeforeOrderVoucher = Math.max(
    itemsTotal - itemDiscountTotal + shippingFee,
    0
  );

  const orderVoucherDiscount = (() => {
    if (!orderVoucher) return 0;

    if (orderVoucher.DiscountType === "percent") {
      return Math.floor(
        (totalBeforeOrderVoucher * orderVoucher.Discount) / 100
      );
    }
    return orderVoucher.Discount;
  })();

  const grandTotal = Math.max(
    totalBeforeOrderVoucher - orderVoucherDiscount,
    0
  );

  const fmt = (n) => Number(n || 0).toLocaleString();

  if (loading) return <p className="text-center mt-10">Đang tải...</p>;

  // ================= RENDER =================
  return (
    <>
      <Header />

      <div className="bg-gray-100 py-8">
        <form className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

          {/* ===== ĐỊA CHỈ ===== */}
          <section className="p-6 border-b">
            <h3 className="text-lg font-semibold text-orange-600 mb-3">
              📍 Địa chỉ nhận hàng
            </h3>

            <select
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400"
              value={selectedAddress?.AddressId || ""}
              onChange={(e) =>
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
          </section>

          {/* ===== SẢN PHẨM ===== */}
          <section className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">🛒 Sản phẩm</h3>

            {items.map(item => (
              <div key={item.CartId ?? `buy-${item.ProductId}`} className="flex gap-4">
                <img
                  src={item.Image}
                  alt={item.ProductName}
                  className="w-24 h-24 object-cover rounded-lg"
                />

                <div className="flex-1">
                  <h4 className="font-medium">{item.ProductName}</h4>
                  <p className="text-sm text-gray-500">
                    Số lượng: {item.Quantity}
                  </p>
                  <p className="text-sm text-gray-500">
                    Giá: {fmt(item.UnitPrice)}đ
                  </p>

                  {/* Voucher sản phẩm */}
                  <select
                    className="mt-2 w-full p-2 text-sm rounded-md border border-gray-200"
                    value={item.selectedVoucher?.VoucherId || ""}
                    onChange={(e) => {
                      const v = item.vouchers.find(
                        x => x.VoucherId === Number(e.target.value)
                      );
                      setItems(prev =>
                        prev.map(i =>
                          i.CartId === item.CartId
                            ? { ...i, selectedVoucher: v || null }
                            : i
                        )
                      );
                    }}
                  >
                    <option value="">🎟️ Chọn voucher cho sản phẩm</option>

                    {item.vouchers.map(v => {
                      const disabled =
                        (usedVoucherUsageIds.includes(v.UsageId) &&
                          item.selectedVoucher?.UsageId !== v.UsageId) ||
                        orderVoucherUsageId === v.UsageId;

                      return (
                        <option
                          key={v.UsageId}
                          value={v.VoucherId}
                          disabled={disabled}
                        >
                          {v.VoucherName} –{" "}
                          {v.DiscountType === "percent"
                            ? `${v.Discount}%`
                            : `${fmt(v.Discount)}đ`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="text-right font-semibold text-red-500 text-lg">
                  {calcItemTotal(item).toLocaleString()}đ
                </div>
              </div>
            ))}
          </section>

          {/* ===== VOUCHER TOÀN ĐƠN ===== */}
          <section className="p-6 border-t">
            <h3 className="font-semibold mb-2">🎫 Voucher toàn đơn</h3>

            <select
              className="w-full p-3 rounded-lg border border-gray-200"
              value={orderVoucher?.VoucherId || ""}
              onChange={(e) => {
                const v = orderVouchers.find(
                  x => x.VoucherId === Number(e.target.value)
                );
                setOrderVoucher(v || null);
              }}
            >
              <option value="">Không dùng voucher</option>

              {orderVouchers.map(v => {
                const disabled = usedVoucherUsageIds.includes(v.UsageId);

                return (
                  <option
                    key={v.VoucherId}
                    value={v.VoucherId}
                    disabled={disabled}
                  >
                    {v.VoucherName} –{" "}
                    {v.DiscountType === "percent"
                      ? `${v.Discount}%`
                      : `${v.Discount.toLocaleString()}đ`}
                  </option>
                );
              })}
            </select>
          </section>

          {/* ===== VẬN CHUYỂN ===== */}
          <section className="p-6 border-t">
            <h3 className="font-semibold mb-2">🚚 Phương thức vận chuyển</h3>

            <select
              className="w-full p-3 rounded-lg border border-gray-200"
              value={selectedShipType?.ShipTypeId || ""}
              onChange={(e) =>
                setSelectedShipType(
                  shipTypes.find(
                    x => x.ShipTypeId === Number(e.target.value)
                  )
                )
              }
            >
              {shipTypes.map(st => (
                <option key={st.ShipTypeId} value={st.ShipTypeId}>
                  {st.Content} (+{st.ShipFee.toLocaleString()}đ)
                </option>
              ))}
            </select>
          </section>

          {/* ===== TỔNG ===== */}
          <section className="p-6 border-t bg-gray-50">
            <div className="text-right text-sm space-y-1">
              <p>Giá hàng: {fmt(itemsTotal)}đ</p>
              <p>Giảm giá: -{fmt(itemDiscountTotal)}đ</p>
              <p>Phí ship: {fmt(shippingFee)}đ</p>

              {orderVoucher && (
                <p className="text-green-600">
                  Voucher: -{fmt(orderVoucherDiscount)}đ
                </p>
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-lg font-semibold">Tổng thanh toán</span>
              <span className="text-2xl font-bold text-red-500">
                {fmt(grandTotal)}đ
              </span>
            </div>

            <button
              type="button"
              className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
              onClick={() => alert("TODO: confirm order")}
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
