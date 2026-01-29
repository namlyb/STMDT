import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import { CreditCard, Package, Truck, MapPin, Ticket, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

export default function Order() {
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [items, setItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [shipTypes, setShipTypes] = useState([]);
  const [orderVouchers, setOrderVouchers] = useState([]);
  const [allVouchers, setAllVouchers] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedOrderVoucher, setSelectedOrderVoucher] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBuyNow, setIsBuyNow] = useState(false);

  // Track used voucher UsageIds
  const [usedVoucherUsageIds, setUsedVoucherUsageIds] = useState(new Set());

  /* ================= FORMAT ================= */
  const fmt = n => Number(n || 0).toLocaleString("vi-VN");

  /* ================= INITIAL CHECK ================= */
  useEffect(() => {
    // Kiểm tra đăng nhập
    const account = JSON.parse(sessionStorage.getItem("account"));
    if (!account) {
      navigate("/login", { replace: true });
      return;
    }

    // Kiểm tra xem có dữ liệu mua ngay không
    const buyNowData = localStorage.getItem("buyNowData");
    const cartIds = JSON.parse(sessionStorage.getItem("checkoutCartIds")) || [];

    if (buyNowData && !cartIds.length) {
      setIsBuyNow(true);
    } else {
      setIsBuyNow(false);
    }
  }, [navigate]);

  /* ================= FETCH DATA ================= */
  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const account = JSON.parse(sessionStorage.getItem("account"));
        if (!account) return;

        setLoading(true);

        // Kiểm tra mode mua hàng
        const buyNowData = JSON.parse(localStorage.getItem("buyNowData"));
        const cartIds = JSON.parse(sessionStorage.getItem("checkoutCartIds")) || [];

        let checkoutRes;

        if (buyNowData && buyNowData.buyNow && !cartIds.length) {
          // Mua ngay từ ProductDetail
          checkoutRes = await axios.post("/orders/checkout/buynow", {
            productId: buyNowData.productId,
            quantity: buyNowData.quantity || 1
          });
        } else {
          // Mua từ giỏ hàng
          checkoutRes = await axios.post("/orders/checkout", { cartIds });
        }

        // Lấy các dữ liệu khác
        const [addrRes, shipRes, paymentRes] = await Promise.all([
          axios.get(`/addresses/account/${account.AccountId}`),
          axios.get("/orders/shiptypes"),
          axios.get("/payment-methods") // Thêm API lấy payment methods
        ]);

        // Process items
        const processedItems = checkoutRes.data.items.map((item, index) => ({
          ...item,
          itemId: item.CartId || `buynow_${item.ProductId}_${index}`,
          selectedShipType: shipRes.data?.[0] || null,
          selectedVoucher: null
        }));

        setItems(processedItems);
        setOrderVouchers(checkoutRes.data.orderVouchers || []);
        setAllVouchers(checkoutRes.data.allVouchers || []);
        setAddresses(addrRes.data || []);
        setShipTypes(shipRes.data || []);
        setPaymentMethods(paymentRes.data || []); // Set payment methods

        // Set default selections
        if (addrRes.data?.length) {
          setSelectedAddress(addrRes.data[0]);
        }

        if (paymentRes.data?.length) {
          setSelectedPaymentMethod(paymentRes.data[0]); // Set default payment method
        }

        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Không thể tải dữ liệu checkout");

        // Clean up và redirect
        localStorage.removeItem("buyNowData");
        navigate("/cart");
      }
    };

    fetchData();
  }, [navigate]);

  /* ================= HANDLE PAYMENT METHOD CHANGE ================= */
  const handlePaymentMethodChange = (methodId) => {
    const method = paymentMethods.find(m => m.MethodId === Number(methodId));
    setSelectedPaymentMethod(method || null);
  };


  /* ================= HANDLE SELECT CHANGES ================= */
  const handleVoucherChange = (itemId, usageId) => {
    setItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        let selectedVoucher = null;

        if (usageId) {
          const voucher = item.vouchers.find(v => v.UsageId === Number(usageId));

          if (voucher && usedVoucherUsageIds.has(voucher.UsageId) &&
            (!item.selectedVoucher || item.selectedVoucher.UsageId !== voucher.UsageId)) {
            alert("Voucher này đã được sử dụng cho sản phẩm khác hoặc voucher toàn đơn");
            return { ...item };
          }

          selectedVoucher = voucher || null;

          if (selectedVoucher) {
            const newUsedIds = new Set(usedVoucherUsageIds);
            if (item.selectedVoucher) {
              newUsedIds.delete(item.selectedVoucher.UsageId);
            }
            newUsedIds.add(selectedVoucher.UsageId);
            setUsedVoucherUsageIds(newUsedIds);
          } else if (item.selectedVoucher) {
            const newUsedIds = new Set(usedVoucherUsageIds);
            newUsedIds.delete(item.selectedVoucher.UsageId);
            setUsedVoucherUsageIds(newUsedIds);
          }
        } else if (item.selectedVoucher) {
          const newUsedIds = new Set(usedVoucherUsageIds);
          newUsedIds.delete(item.selectedVoucher.UsageId);
          setUsedVoucherUsageIds(newUsedIds);
        }

        return { ...item, selectedVoucher };
      }
      return item;
    }));
  };

  const handleShipTypeChange = (itemId, shipTypeId) => {
    setItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        const selectedShipType = shipTypes.find(s => s.ShipTypeId === Number(shipTypeId)) || null;
        return { ...item, selectedShipType };
      }
      return item;
    }));
  };

  const handleOrderVoucherChange = (usageId) => {
    if (usageId) {
      const voucher = orderVouchers.find(v => v.UsageId === Number(usageId));

      if (voucher && usedVoucherUsageIds.has(voucher.UsageId)) {
        alert("Voucher này đã được sử dụng cho sản phẩm");
        return;
      }

      setSelectedOrderVoucher(voucher || null);

      if (voucher) {
        const newUsedIds = new Set(usedVoucherUsageIds);
        if (selectedOrderVoucher) {
          newUsedIds.delete(selectedOrderVoucher.UsageId);
        }
        newUsedIds.add(voucher.UsageId);
        setUsedVoucherUsageIds(newUsedIds);
      }
    } else if (selectedOrderVoucher) {
      const newUsedIds = new Set(usedVoucherUsageIds);
      newUsedIds.delete(selectedOrderVoucher.UsageId);
      setUsedVoucherUsageIds(newUsedIds);
      setSelectedOrderVoucher(null);
    } else {
      setSelectedOrderVoucher(null);
    }
  };

  /* ================= CHECK VOUCHER AVAILABILITY ================= */
  const getProductVoucherAvailabilityStatus = (voucher, currentItem) => {
    if (currentItem.selectedVoucher?.UsageId === voucher.UsageId) {
      return "selected";
    }

    if (usedVoucherUsageIds.has(voucher.UsageId)) {
      return "used_by_other";
    }

    if (currentItem.totalPrice < voucher.MinOrderValue) {
      return "min_order_not_met";
    }

    return "available";
  };

  const getOrderVoucherAvailabilityStatus = (voucher) => {
    if (usedVoucherUsageIds.has(voucher.UsageId)) {
      return "used_by_product";
    }

    return "available";
  };

  /* ================= CALCULATIONS ================= */
  const calcItemDiscount = (item) => {
    const v = item.selectedVoucher;
    if (!v) return 0;

    if (item.totalPrice < v.MinOrderValue) return 0;

    let discount = 0;
    if (v.DiscountType === "percent") {
      discount = Math.floor(item.totalPrice * v.DiscountValue / 100);
      if (v.MaxDiscount) discount = Math.min(discount, v.MaxDiscount);
    } else {
      discount = v.DiscountValue;
    }

    return Math.min(discount, item.totalPrice);
  };

  const calcItemFinal = (item) => {
    const discount = calcItemDiscount(item);
    return Math.max(item.totalPrice - discount, 0);
  };

  const getOrderVoucherDiscount = () => {
    if (!selectedOrderVoucher) return { product: 0, ship: 0 };

    const productTotalAfterItemDiscount = items.reduce(
      (sum, item) => sum + calcItemFinal(item), 0
    );

    const totalShip = items.reduce(
      (sum, item) => sum + (item.selectedShipType?.ShipFee || 0), 0
    );

    if (productTotalAfterItemDiscount < selectedOrderVoucher.MinOrderValue) {
      return { product: 0, ship: 0 };
    }

    const v = selectedOrderVoucher;

    if (v.DiscountType === "ship") {
      return {
        product: 0,
        ship: Math.min(totalShip, v.DiscountValue)
      };
    }

    let discount = 0;
    if (v.DiscountType === "percent") {
      discount = Math.floor(productTotalAfterItemDiscount * v.DiscountValue / 100);
      if (v.MaxDiscount) discount = Math.min(discount, v.MaxDiscount);
    } else {
      discount = v.DiscountValue;
    }

    return {
      product: Math.min(discount, productTotalAfterItemDiscount),
      ship: 0
    };
  };

  /* ================= TOTALS ================= */
  const productTotalOriginal = items.reduce(
    (sum, item) => sum + item.totalPrice, 0
  );

  const productTotalAfterItemDiscount = items.reduce(
    (sum, item) => sum + calcItemFinal(item), 0
  );

  const totalShip = items.reduce(
    (sum, item) => sum + (item.selectedShipType?.ShipFee || 0), 0
  );

  const orderVoucherDiscount = getOrderVoucherDiscount();
  const grandTotal =
    (productTotalAfterItemDiscount - orderVoucherDiscount.product) +
    (totalShip - orderVoucherDiscount.ship);

  /* ================= HANDLE BACK ================= */
  const handleBack = () => {
    if (isBuyNow) {
      const buyNowData = JSON.parse(localStorage.getItem("buyNowData"));
      if (buyNowData?.productId) {
        navigate(`/product/${buyNowData.productId}`);
      } else {
        navigate("/");
      }
      localStorage.removeItem("buyNowData");
    } else {
      navigate("/cart");
    }
  };

  /* ================= HANDLE CHECKOUT ================= */
  const handleCheckout = async () => {
    if (!selectedAddress) {
      alert("Vui lòng chọn địa chỉ nhận hàng");
      return;
    }

    if (items.some(item => !item.selectedShipType)) {
      alert("Vui lòng chọn phương thức vận chuyển cho tất cả sản phẩm");
      return;
    }

    if (!selectedPaymentMethod) {
      alert("Vui lòng chọn phương thức thanh toán");
      return;
    }

    // Kiểm tra voucher trùng
    const allSelectedVoucherIds = new Set();
    items.forEach(item => {
      if (item.selectedVoucher) {
        allSelectedVoucherIds.add(item.selectedVoucher.UsageId);
      }
    });

    if (selectedOrderVoucher && allSelectedVoucherIds.has(selectedOrderVoucher.UsageId)) {
      alert("Có voucher đang được sử dụng ở cả sản phẩm và đơn hàng. Vui lòng kiểm tra lại.");
      return;
    }

    try {
      // Chuẩn bị dữ liệu đơn hàng
      const orderData = {
        addressId: selectedAddress.AddressId,
        items: items.map(item => ({
          productId: item.ProductId,
          quantity: item.Quantity,
          selectedVoucherId: item.selectedVoucher?.UsageId || null,
          selectedShipTypeId: item.selectedShipType?.ShipTypeId
        })),
        orderVoucherId: selectedOrderVoucher?.UsageId || null,
        paymentMethodId: selectedPaymentMethod.MethodId // Sử dụng selectedPaymentMethod
      };

      // Gọi API tạo đơn hàng
      const response = await axios.post("/orders", orderData);

      alert("Đặt hàng thành công! Mã đơn hàng: #" + response.data.orderId);

      // Xóa dữ liệu tạm
      localStorage.removeItem("buyNowData");
      sessionStorage.removeItem("checkoutCartIds");

      // Chuyển hướng đến trang chi tiết đơn hàng hoặc trang chủ
      navigate("/profile?tab=orders");

    } catch (error) {
      console.error("Order error:", error);
      alert(error.response?.data?.message || "Đặt hàng thất bại. Vui lòng thử lại.");
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Đang tải đơn hàng...</p>
            <p className="text-gray-400 text-sm mt-2">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {isBuyNow ? "Quay lại sản phẩm" : "Quay lại giỏ hàng"}
              </button>
              <h1 className="text-3xl font-bold text-gray-800">Thanh toán</h1>
              <p className="text-gray-500 mt-2">
                {isBuyNow ? "Mua ngay - Hoàn tất đơn hàng" : "Hoàn tất đơn hàng của bạn"}
                {isBuyNow && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Mua ngay
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600">
                <Package className="w-5 h-5" />
              </div>
              <div className="h-1 w-8 bg-orange-500"></div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Warning message for voucher usage */}
          {usedVoucherUsageIds.size > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-700">
                    Mỗi voucher chỉ được sử dụng một lần. Voucher đã chọn cho sản phẩm sẽ không khả dụng cho voucher toàn đơn và ngược lại.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Address Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Địa chỉ nhận hàng</h3>
                      <p className="text-sm text-gray-500">Chọn địa chỉ giao hàng của bạn</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${selectedAddress ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}>
                      {selectedAddress ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-800">{selectedAddress.Name}</span>
                              <span className="text-sm text-gray-500">|</span>
                              <span className="text-sm text-gray-600">{selectedAddress.Phone}</span>
                              {selectedAddress.Status === 1 && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{selectedAddress.Content}</p>
                          </div>
                          <button
                            onClick={() => navigate("/address")}
                            className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          >
                            Thay đổi
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-400 mb-3">Chưa có địa chỉ nào</p>
                          <button
                            onClick={() => navigate("/address/add")}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition"
                          >
                            + Thêm địa chỉ mới
                          </button>
                        </div>
                      )}
                    </div>

                    {addresses.length > 0 && (
                      <select
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={selectedAddress?.AddressId || ""}
                        onChange={e => {
                          const addr = addresses.find(a => a.AddressId === Number(e.target.value));
                          setSelectedAddress(addr);
                        }}
                      >
                        {addresses.map(a => (
                          <option key={a.AddressId} value={a.AddressId}>
                            {a.Name} | {a.Phone} | {a.Content}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Sản phẩm đã chọn</h3>
                      <p className="text-sm text-gray-500">{items.length} sản phẩm trong đơn hàng</p>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Không có sản phẩm nào</p>
                      <button
                        onClick={() => navigate("/cart")}
                        className="mt-4 px-6 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg transition"
                      >
                        Quay lại giỏ hàng
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item.itemId} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition">
                          <div className="relative">
                            <img
                              src={item.Image}
                              alt={item.ProductName}
                              className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                            />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {item.Quantity}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div className="flex-1">
                                <h4
                                  onClick={() => navigate(`/product/${item.ProductId}`)}
                                  className="font-semibold text-gray-800 hover:text-orange-500 cursor-pointer transition mb-1"
                                >
                                  {item.ProductName}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                  <span>Đơn giá: <strong className="text-gray-700">{fmt(item.UnitPrice)}đ</strong></span>
                                  <span>•</span>
                                  <span>Tổng: <strong className="text-gray-700">{fmt(item.totalPrice)}đ</strong></span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-gray-400 line-through mb-1">
                                  {fmt(item.totalPrice)}đ
                                </div>
                                <div className="font-bold text-red-500 text-lg">
                                  {fmt(calcItemFinal(item))}đ
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {/* Voucher Selector */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <Ticket className="w-4 h-4" />
                                  Voucher sản phẩm
                                  {item.selectedVoucher && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                      Đã chọn
                                    </span>
                                  )}
                                </label>
                                <div className="relative">
                                  <select
                                    className="w-full p-3 pr-10 text-sm rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition appearance-none bg-white"
                                    value={item.selectedVoucher?.UsageId || ""}
                                    onChange={(e) => handleVoucherChange(item.itemId, e.target.value)}
                                  >
                                    <option value="">Không sử dụng</option>
                                    {item.vouchers && item.vouchers.length > 0 ? (
                                      item.vouchers.map(v => {
                                        const status = getProductVoucherAvailabilityStatus(v, item);
                                        const isDisabled = status !== "selected" && status !== "available";

                                        let statusText = "";
                                        if (status === "used_by_other") {
                                          statusText = " - Đã sử dụng";
                                        } else if (status === "min_order_not_met") {
                                          statusText = " - Không đủ điều kiện";
                                        }

                                        return (
                                          <option
                                            key={v.UsageId}
                                            value={v.UsageId}
                                            disabled={isDisabled}
                                            className={`${isDisabled ? "text-gray-400 bg-gray-50" : ""}`}
                                          >
                                            {v.VoucherName} -
                                            {v.DiscountType === "percent"
                                              ? ` Giảm ${v.DiscountValue}% ${v.MaxDiscount ? ` - tối đa ${v.MaxDiscount}đ` : ""}`
                                              : ` Giảm ${fmt(v.DiscountValue)}đ`
                                            }
                                            {v.MinOrderValue > 0 && ` (Tối thiểu ${fmt(v.MinOrderValue)}đ)`}
                                            {statusText}
                                          </option>
                                        );
                                      })
                                    ) : (
                                      <option disabled>Không có voucher khả dụng</option>
                                    )}
                                  </select>
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                {item.selectedVoucher && (
                                  <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-sm font-medium text-green-800">
                                          {item.selectedVoucher.VoucherName}
                                        </span>
                                        <p className="text-xs text-green-600 mt-0.5">
                                          Giảm {fmt(calcItemDiscount(item))}đ
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleVoucherChange(item.itemId, "")}
                                        className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Shipping Selector */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  Vận chuyển
                                </label>
                                <div className="relative">
                                  <select
                                    className="w-full p-3 pr-10 text-sm rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition appearance-none bg-white"
                                    value={item.selectedShipType?.ShipTypeId || ""}
                                    onChange={(e) => handleShipTypeChange(item.itemId, e.target.value)}
                                  >
                                    {shipTypes.length > 0 ? (
                                      shipTypes.map(s => (
                                        <option key={s.ShipTypeId} value={s.ShipTypeId}>
                                          {s.Content} (+{fmt(s.ShipFee)}đ)
                                        </option>
                                      ))
                                    ) : (
                                      <option disabled>Đang tải...</option>
                                    )}
                                  </select>
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                {item.selectedShipType && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    Phí vận chuyển: <span className="font-medium">{fmt(item.selectedShipType.ShipFee)}đ</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Order Voucher */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-purple-600">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Voucher toàn đơn</h3>
                      <p className="text-sm text-gray-500">Áp dụng cho toàn bộ đơn hàng</p>
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <select
                      className="w-full p-3 pr-10 text-sm rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition appearance-none bg-white"
                      value={selectedOrderVoucher?.UsageId || ""}
                      onChange={(e) => handleOrderVoucherChange(e.target.value)}
                    >
                      <option value="">Không sử dụng voucher</option>
                      {orderVouchers.length > 0 ? (
                        orderVouchers.map(v => {
                          const status = getOrderVoucherAvailabilityStatus(v);
                          const isDisabled = status !== "available";

                          let statusText = "";
                          if (status === "used_by_product") {
                            statusText = " - Đang dùng cho sản phẩm";
                          }

                          return (
                            <option
                              key={v.UsageId}
                              value={v.UsageId}
                              disabled={isDisabled}
                              className={`${isDisabled ? "text-gray-400 bg-gray-50" : ""}`}
                            >
                              {v.VoucherName} -
                              {v.DiscountType === "ship"
                                ? ` Giảm ship ${fmt(v.DiscountValue)}đ`
                                : v.DiscountType === "percent"
                                  ? ` Giảm ${v.DiscountValue}% - tối đa ${fmt(v.MaxDiscount)}đ`
                                  : ` Giảm ${fmt(v.DiscountValue)}đ`
                              }
                              {v.MinOrderValue > 0 && ` - Đơn tối thiểu ${fmt(v.MinOrderValue)}đ`}
                              {statusText}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>Không có voucher toàn đơn</option>
                      )}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {selectedOrderVoucher && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-800">{selectedOrderVoucher.VoucherName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-purple-600">
                              {selectedOrderVoucher.DiscountType === "ship"
                                ? `Giảm ship ${fmt(selectedOrderVoucher.DiscountValue)}đ`
                                : selectedOrderVoucher.DiscountType === "percent"
                                  ? `Giảm ${selectedOrderVoucher.DiscountValue}%`
                                  : `Giảm ${fmt(selectedOrderVoucher.DiscountValue)}đ`
                              }
                            </span>
                            {selectedOrderVoucher.MinOrderValue > 0 && (
                              <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded">
                                Tối thiểu {fmt(selectedOrderVoucher.MinOrderValue)}đ
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOrderVoucherChange("")}
                          className="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

{/* Payment Method Selector */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Phương thức thanh toán</h4>
                    <p className="text-sm text-gray-500">Chọn phương thức thanh toán</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-400">Đang tải phương thức thanh toán...</p>
                    </div>
                  ) : (
                    <>
                      {/* Dropdown cho mobile */}
                      <div className="md:hidden">
                        <div className="relative">
                          <select
                            className="w-full p-3 pr-10 text-sm rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition appearance-none bg-white"
                            value={selectedPaymentMethod?.MethodId || ""}
                            onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          >
                            <option value="">Chọn phương thức thanh toán</option>
                            {paymentMethods.map((method) => (
                              <option
                                key={method.MethodId}
                                value={method.MethodId}
                                className="text-gray-700"
                              >
                                {method.MethodName}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Grid hiển thị cho desktop */}
                      <div className="hidden md:grid grid-cols-1 gap-3">
                        {paymentMethods.map((method) => (
                          <div
                            key={method.MethodId}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${selectedPaymentMethod?.MethodId === method.MethodId
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            onClick={() => handlePaymentMethodChange(method.MethodId)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod?.MethodId === method.MethodId
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                                }`}>
                                {selectedPaymentMethod?.MethodId === method.MethodId && (
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium text-gray-800">{method.MethodName}</h5>
                                  {method.IconUrl && (
                                    <img
                                      src={method.IconUrl}
                                      alt={method.MethodName}
                                      className="w-8 h-8 object-contain"
                                    />
                                  )}
                                </div>
                                {method.Description && (
                                  <p className="text-sm text-gray-500 mt-1">{method.Description}</p>
                                )}
                                {method.AdditionalInfo && (
                                  <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                                    {method.AdditionalInfo}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}                  
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">Tổng thanh toán</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng</span>
                      <span className="font-medium">{fmt(productTotalOriginal)}đ</span>
                    </div>

                    {productTotalOriginal > productTotalAfterItemDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Giảm voucher sản phẩm</span>
                        <span className="font-medium">- {fmt(productTotalOriginal - productTotalAfterItemDiscount)}đ</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Phí vận chuyển</span>
                      <span className="font-medium">{fmt(totalShip)}đ</span>
                    </div>

                    {orderVoucherDiscount.product > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Giảm voucher đơn hàng</span>
                        <span className="font-medium">- {fmt(orderVoucherDiscount.product)}đ</span>
                      </div>
                    )}

                    {orderVoucherDiscount.ship > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Giảm phí vận chuyển</span>
                        <span className="font-medium">- {fmt(orderVoucherDiscount.ship)}đ</span>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-800">Tổng thanh toán</span>
                        <div>
                          <div className="text-2xl font-bold text-red-500">{fmt(grandTotal)}đ</div>
                          <p className="text-xs text-gray-400 text-right mt-1">Đã bao gồm VAT</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                  <button
                    onClick={handleCheckout}
                    disabled={!selectedAddress || items.length === 0}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] ${!selectedAddress || items.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white cursor-pointer shadow-lg hover:shadow-xl"
                      }`}
                  >
                    {!selectedAddress
                      ? "CHỌN ĐỊA CHỈ"
                      : items.length === 0
                        ? "KHÔNG CÓ SẢN PHẨM"
                        : `THANH TOÁN ${fmt(grandTotal)}đ`
                    }
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Bằng cách đặt hàng, bạn đồng ý với <a href="#" className="text-orange-500 hover:underline">Điều khoản dịch vụ</a> của chúng tôi
                  </p>
                </div>
              </div>

              
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}