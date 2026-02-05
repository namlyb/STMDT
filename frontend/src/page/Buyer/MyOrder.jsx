import { useState, useEffect, Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import Sidebar from "../../components/Buyer/Sidebar";
import { 
  Package, CheckCircle, Clock, Truck, XCircle, RotateCcw, 
  CreditCard, MessageCircle, Star, AlertCircle, Calendar, 
  MapPin, Hash, Eye, RefreshCw, ShoppingBag, Ticket, 
  Percent, Tag, Truck as TruckIcon, Wallet, Ban
} from "lucide-react";

export default function MyOrder() {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fmt = n => Number(n || 0).toLocaleString("vi-VN");

  // Trạng thái ĐƠN HÀNG (Order)
  const ORDER_STATUS_MAP = {
    1: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    2: { label: "Chờ chuẩn bị", color: "bg-blue-100 text-blue-800", icon: Package },
    3: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: Truck },
    4: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: CheckCircle },
    5: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: XCircle },
    6: { label: "Trả hàng", color: "bg-orange-100 text-orange-800", icon: RotateCcw },
    7: { label: "Chờ chuẩn bị", color: "bg-blue-100 text-blue-800", icon: Package }
  };

  // Trạng thái SẢN PHẨM (OrderDetail)
  const ORDER_DETAIL_STATUS_MAP = {
    1: { label: "Chờ chuẩn bị", color: "bg-yellow-100 text-yellow-800", icon: Package },
    2: { label: "Đã chuẩn bị xong", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
    3: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: Truck },
    4: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: CheckCircle },
    5: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: Ban },
    6: { label: "Trả hàng", color: "bg-orange-100 text-orange-800", icon: RotateCcw }
  };

  const TABS = [
    { id: "all", label: "Tất cả" },
    { id: "1", label: "Chờ thanh toán" },
    { id: "2", label: "Chờ chuẩn bị" },
    { id: "3", label: "Đang giao" },
    { id: "4", label: "Hoàn thành" },
    { id: "5", label: "Đã hủy" },
    { id: "6", label: "Trả hàng" }
  ];

  // Format voucher hiển thị
  const formatVoucherDisplay = (voucher) => {
    if (!voucher || !voucher.VoucherName) return null;
    
    const { VoucherName, DiscountType, DiscountValue, MaxDiscount } = voucher;
    
    let discountText = "";
    if (DiscountType === 'percent') {
      discountText = `Giảm ${DiscountValue}%`;
      if (MaxDiscount) {
        discountText += ` (tối đa ${fmt(MaxDiscount)}đ)`;
      }
    } else if (DiscountType === 'fixed') {
      discountText = `Giảm ${fmt(DiscountValue)}đ`;
    } else if (DiscountType === 'ship') {
      discountText = `Miễn phí ship ${fmt(DiscountValue)}đ`;
    }
    
    return {
      name: VoucherName,
      text: discountText,
      type: DiscountType
    };
  };

  // Tính discount cho từng sản phẩm
  const calculateItemDiscount = (item) => {
    if (!item.DiscountType || !item.DiscountValue) return 0;
    
    const itemTotal = item.UnitPrice * item.Quantity;
    
    if (item.DiscountType === 'percent') {
      let discount = Math.floor(itemTotal * item.DiscountValue / 100);
      if (item.MaxDiscount) {
        discount = Math.min(discount, item.MaxDiscount);
      }
      return discount;
    } else if (item.DiscountType === 'fixed') {
      return Math.min(item.DiscountValue, itemTotal);
    } else if (item.DiscountType === 'ship') {
      return 0;
    }
    return 0;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const account = JSON.parse(sessionStorage.getItem("account"));
      const token = sessionStorage.getItem("token");
      
      if (!account || !token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      
      const response = await axios.get("/orders/my-orders", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const formattedOrders = response.data.map(order => ({
        ...order,
        CreatedAt: new Date(order.CreatedAt).toLocaleDateString("vi-VN"),
        UpdatedAt: new Date(order.UpdatedAt).toLocaleDateString("vi-VN"),
        OrderDate: new Date(order.OrderDate).toLocaleDateString("vi-VN"),
        itemCount: order.itemCount || 1
      }));
      
      setAllOrders(formattedOrders);
    } catch (error) {
      console.error("Fetch orders error:", error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("account");
        navigate("/login");
      } else {
        alert("Không thể tải danh sách đơn hàng");
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return allOrders;
    return allOrders.filter(order => order.Status === parseInt(activeTab));
  }, [allOrders, activeTab]);

  // Paginate orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, page, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  useEffect(() => {
    setDisplayedOrders(paginatedOrders);
  }, [paginatedOrders]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchOrderDetail = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token");
      
      const response = await axios.get(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Format image URL và tính toán discount
      const detailsWithCalculations = response.data.details.map(detail => {
        const itemDiscount = calculateItemDiscount(detail);
        const itemTotal = detail.UnitPrice * detail.Quantity;
        const finalPrice = itemTotal - itemDiscount;
        
        return {
          ...detail,
          Image: detail.Image || "https://via.placeholder.com/80",
          itemTotal: itemTotal,
          itemDiscount: itemDiscount,
          finalPrice: Math.max(finalPrice, 0),
          voucherDisplay: formatVoucherDisplay(detail)
        };
      });
      
      // Tính toán tổng hợp
      const productTotal = detailsWithCalculations.reduce((sum, item) => sum + item.itemTotal, 0);
      const productDiscount = detailsWithCalculations.reduce((sum, item) => sum + item.itemDiscount, 0);
      const totalShip = detailsWithCalculations.reduce((sum, item) => sum + item.ShipFee, 0);
      
      // Xử lý voucher toàn đơn
      let orderVoucherDisplay = null;
      let orderDiscount = 0;
      let orderShipDiscount = 0;
      
      if (response.data.order.OrderVoucherId) {
        const orderVoucher = {
          VoucherName: response.data.order.OrderVoucherName,
          DiscountType: response.data.order.OrderDiscountType,
          DiscountValue: response.data.order.OrderDiscountValue,
          MaxDiscount: response.data.order.OrderMaxDiscount
        };
        
        orderVoucherDisplay = formatVoucherDisplay(orderVoucher);
        
        const productTotalAfterItemDiscount = productTotal - productDiscount;
        
        if (orderVoucher.DiscountType === 'ship') {
          orderShipDiscount = Math.min(totalShip, orderVoucher.DiscountValue);
        } else if (orderVoucher.DiscountType === 'percent') {
          const percentDiscount = Math.floor(productTotalAfterItemDiscount * orderVoucher.DiscountValue / 100);
          orderDiscount = orderVoucher.MaxDiscount 
            ? Math.min(percentDiscount, orderVoucher.MaxDiscount)
            : percentDiscount;
        } else if (orderVoucher.DiscountType === 'fixed') {
          orderDiscount = Math.min(orderVoucher.DiscountValue, productTotalAfterItemDiscount);
        }
      }
      
      setSelectedOrder({
        ...response.data,
        details: detailsWithCalculations,
        summary: {
          productTotal,
          productDiscount,
          totalShip,
          orderDiscount,
          orderShipDiscount,
          grandTotal: response.data.order.FinalPrice
        },
        hasOrderVoucher: !!response.data.order.OrderVoucherId,
        hasProductVouchers: detailsWithCalculations.some(d => d.voucherDisplay)
      });
      setShowDetail(true);
    } catch (error) {
      console.error("Fetch order detail error:", error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("account");
        navigate("/login");
      } else {
        alert("Không thể tải chi tiết đơn hàng");
      }
    }
  };

  // Tính toán trạng thái thanh toán
  const getPaymentStatus = (order) => {
    if (order.MethodId === 1) { // Thanh toán trực tiếp
      return order.Status === 4 ? "Đã thanh toán" : "Chờ thanh toán";
    } else { // Thanh toán online
      return order.Status === 2 ? "Đã thanh toán" : "Chưa thanh toán";
    }
  };

  const shouldShowPaymentButton = (order) => {
    return order.MethodId !== 1 && order.Status !== 2;
  };

  const handlePayment = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token");
      // Giả sử có API thanh toán
      const response = await axios.post(`/orders/${orderId}/payment`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Chuyển hướng đến trang thanh toán...");
      // Trong thực tế, bạn sẽ redirect đến trang thanh toán
      // window.location.href = response.data.paymentUrl;
      
      // Sau khi thanh toán thành công, refresh data
      fetchOrders();
      setShowDetail(false);
    } catch (error) {
      console.error("Payment error:", error);
      alert("Lỗi khi thực hiện thanh toán: " + (error.response?.data?.message || error.message));
    }
  };

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: allOrders.length };
    TABS.forEach(tab => {
      if (tab.id !== "all") {
        counts[tab.id] = allOrders.filter(order => order.Status === parseInt(tab.id)).length;
      }
    });
    return counts;
  }, [allOrders]);

  const renderOrderStatusBadge = (status) => {
    const statusInfo = ORDER_STATUS_MAP[status] || { label: "Không xác định", color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-4 h-4" />
        {statusInfo.label}
      </span>
    );
  };

  const renderOrderDetailStatusBadge = (status) => {
    const statusInfo = ORDER_DETAIL_STATUS_MAP[status] || { label: "Không xác định", color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${statusInfo.color}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    );
  };

  const getOrderActions = (order) => {
    const actions = [];
    
    switch (order.Status) {
      case 1: // Chờ thanh toán
        actions.push(
          { label: "Thanh toán", action: () => handlePayment(order.OrderId), icon: CreditCard, color: "bg-green-600 cursor-pointer hover:bg-green-700" },
          { label: "Hủy đơn", action: () => handleCancel(order.OrderId), icon: XCircle, color: "bg-red-600 cursor-pointer hover:bg-red-700" }
        );
        break;
      case 2: // Chờ chuẩn bị
        actions.push(
          { label: "Hủy đơn", action: () => handleCancel(order.OrderId), icon: XCircle, color: "bg-red-600 cursor-pointer hover:bg-red-700" }
        );
        break;
      case 3: // Đang giao
        actions.push(
          { label: "Liên hệ shop", action: () => handleContact(order.OrderId), icon: MessageCircle, color: "bg-blue-600 cursor-pointer hover:bg-blue-700" }
        );
        break;
      case 4: // Hoàn thành
        actions.push(
          { label: "Đánh giá", action: () => navigate(`/feedback/${order.OrderId}`), icon: Star, color: "bg-orange-600 cursor-pointer hover:bg-orange-700" },
          { label: "Mua lại", action: () => handleReorder(order.OrderId), icon: RotateCcw, color: "bg-purple-600 cursor-pointer hover:bg-purple-700" }
        );
        break;
    }
    
    return actions;
  };

  const handleCancel = async (orderId) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
      try {
        const token = sessionStorage.getItem("token");
        await axios.put(`/orders/${orderId}/cancel`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Đã hủy đơn hàng thành công");
        fetchOrders();
      } catch (error) {
        const errorMsg = error.response?.data?.message || "Không thể hủy đơn hàng ở trạng thái hiện tại";
        alert(errorMsg);
      }
    }
  };

  const handleContact = (orderId) => {
    navigate(`/chat?order=${orderId}`);
  };

  const handleReorder = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(`/orders/${orderId}/reorder`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Đã thêm sản phẩm vào giỏ hàng");
      navigate("/cart");
    } catch (error) {
      alert("Không thể mua lại đơn hàng này");
    }
  };

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    const { order, details, itemCount, summary, hasOrderVoucher, hasProductVouchers } = selectedOrder;
    const StatusIcon = ORDER_STATUS_MAP[order.Status]?.icon || AlertCircle;
    const paymentStatus = getPaymentStatus(order);
    const showPaymentBtn = shouldShowPaymentButton(order);
    
    // Kiểm tra xem có voucher nào không
    const hasAnyVoucher = hasOrderVoucher || hasProductVouchers;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/30"
          onClick={() => setShowDetail(false)}
        ></div>
        
        <div className="relative bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto z-10">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-gray-700">#{order.OrderId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{order.OrderDate}</span>
                </div>
                {renderOrderStatusBadge(order.Status)}
              </div>
            </div>
            <button
              onClick={() => setShowDetail(false)}
              className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition"
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-8">
            {/* Voucher Section - CHỈ hiện khi có voucher */}
            {hasAnyVoucher && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-purple-600" />
                  Voucher đã sử dụng
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Voucher toàn đơn */}
                  {hasOrderVoucher && (
                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Tag className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">Voucher toàn đơn</h4>
                          <p className="text-sm text-purple-600 font-medium">
                            {order.OrderVoucherName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          {order.OrderDiscountType === 'percent' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-4 h-4" />
                              Giảm {order.OrderDiscountValue}%
                              {order.OrderMaxDiscount && (
                                <span className="text-gray-500 text-xs ml-2">
                                  (tối đa {fmt(order.OrderMaxDiscount)}đ)
                                </span>
                              )}
                            </span>
                          ) : order.OrderDiscountType === 'ship' ? (
                            <span className="flex items-center gap-1">
                              <TruckIcon className="w-4 h-4" />
                              Giảm ship {fmt(order.OrderDiscountValue)}đ
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              Giảm {fmt(order.OrderDiscountValue)}đ
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-red-500">
                          -{fmt(order.OrderDiscountType === 'ship' ? summary.orderShipDiscount : summary.orderDiscount)}đ
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Voucher sản phẩm */}
                  {hasProductVouchers && (
                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">Voucher sản phẩm</h4>
                          <p className="text-sm text-blue-600">
                            {details.filter(d => d.voucherDisplay).length} sản phẩm được áp dụng
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-24 overflow-y-auto">
                        {details
                          .filter(d => d.voucherDisplay)
                          .map((detail, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div className="truncate max-w-[180px]">
                                <span className="text-gray-700">{detail.ProductName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600">{detail.voucherDisplay.text}</span>
                                <span className="font-medium text-red-500">
                                  -{fmt(detail.itemDiscount)}đ
                                </span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Trạng thái đơn hàng</h3>
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step, index) => (
                  <Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${order.Status >= step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {index + 1}
                      </div>
                      <span className="text-sm mt-2 text-gray-600">
                        {ORDER_STATUS_MAP[step]?.label || `Bước ${step}`}
                      </span>
                    </div>
                    {index < 3 && (
                      <div className={`flex-1 h-1 ${order.Status > step ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Address */}
              <div className="border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Địa chỉ giao hàng</h4>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">{order.AddressName || order.AddressContent?.split(',')[0]}</p>
                  <p className="text-gray-600">{order.AddressPhone}</p>
                  <p className="text-gray-600 text-sm">{order.AddressContent}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Thanh toán</h4>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">{order.MethodName}</p>
                  <p className="text-gray-600">Trạng thái: {paymentStatus}</p>
                  
                  {/* Nút thanh toán cho online chưa thanh toán */}
                  {showPaymentBtn && (
                    <button
                      onClick={() => handlePayment(order.OrderId)}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Thanh toán ngay
                    </button>
                  )}
                  
                  <p className="text-lg font-bold text-red-500">{fmt(order.FinalPrice)}đ</p>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-800">Sản phẩm ({itemCount})</h4>
                  <span className="text-sm text-gray-500">{itemCount} sản phẩm</span>
                </div>
              </div>
              <div className="divide-y">
                {details?.map((detail, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={detail.Image}
                          alt={detail.ProductName}
                          className="w-20 h-20 rounded-lg object-cover border"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/80";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h5 className="font-medium text-gray-800">{detail.ProductName}</h5>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>Đơn giá: {fmt(detail.UnitPrice)}đ</span>
                              <span>•</span>
                              <span>Số lượng: {detail.Quantity}</span>
                              <span>•</span>
                              <span>Tổng: {fmt(detail.itemTotal)}đ</span>
                            </div>
                            
                            {/* Hiển thị voucher sản phẩm nếu có */}
                            {detail.voucherDisplay && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  <Ticket className="w-3 h-3" />
                                  <span>{detail.voucherDisplay.name}:</span>
                                  <span className="font-medium">{detail.voucherDisplay.text}</span>
                                </div>
                                <div className="text-sm text-red-500 font-medium">
                                  -{fmt(detail.itemDiscount)}đ
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-blue-600">Phí ship: {fmt(detail.ShipFee)}đ</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-500">
                              {fmt(detail.finalPrice + detail.ShipFee)}đ
                            </div>
                            <div className="mt-2">
                              {renderOrderDetailStatusBadge(detail.Status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-6 border-t">
                <div className="flex justify-end">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng:</span>
                      <span>{fmt(summary.productTotal)}đ</span>
                    </div>
                    
                    {/* Giảm giá voucher sản phẩm */}
                    {summary.productDiscount > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Giảm voucher sản phẩm:</span>
                        <span>- {fmt(summary.productDiscount)}đ</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-600">
                      <span>Phí vận chuyển:</span>
                      <span>{fmt(summary.totalShip)}đ</span>
                    </div>
                    
                    {/* Giảm ship từ voucher toàn đơn */}
                    {summary.orderShipDiscount > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Giảm phí vận chuyển:</span>
                        <span>- {fmt(summary.orderShipDiscount)}đ</span>
                      </div>
                    )}
                    
                    {/* Giảm giá từ voucher toàn đơn (không phải ship) */}
                    {summary.orderDiscount > 0 && (
                      <div className="flex justify-between text-purple-600">
                        <span>Giảm voucher toàn đơn:</span>
                        <span>- {fmt(summary.orderDiscount)}đ</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Tổng thanh toán:</span>
                        <span className="text-red-500">{fmt(summary.grandTotal)}đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDetail(false)}
                className="px-6 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Đóng
              </button>
              {getOrderActions(order).map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className={`px-6 py-2 text-white rounded-lg cursor-pointer flex items-center gap-2 transition ${action.color}`}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="hidden md:block w-64">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Đơn hàng của tôi</h1>
                <p className="text-gray-600 mt-2">Quản lý và theo dõi đơn hàng của bạn</p>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl border mb-6">
                <div className="flex overflow-x-auto">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 cursor-pointer px-6 py-4 border-b-2 font-medium transition ${activeTab === tab.id
                          ? 'border-orange-500 text-orange-600 bg-orange-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.label}
                        <span className={`px-2 py-1 text-xs rounded-full ${activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                          {tabCounts[tab.id] || 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Đang tải đơn hàng...</p>
                </div>
              ) : displayedOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có đơn hàng</h3>
                  <p className="text-gray-500 mb-6">Bạn chưa có đơn hàng nào trong mục này</p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
                  >
                    Mua sắm ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedOrders.map(order => {
                    const actions = getOrderActions(order);
                    const paymentStatus = getPaymentStatus(order);
                    
                    return (
                      <div key={order.OrderId} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                        {/* Order Header */}
                        <div className="p-6 border-b">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-400" />
                                <span className="font-mono text-gray-700">#{order.OrderId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{order.CreatedAt}</span>
                              </div>
                              {renderOrderStatusBadge(order.Status)}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-red-500">{fmt(order.FinalPrice)}đ</span>
                            </div>
                          </div>
                        </div>

                        {/* Order Content */}
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row gap-6">
                            {/* Order Info */}
                            <div className="flex-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm text-gray-500">Giao đến</p>
                                    <p className="font-medium truncate max-w-[200px]">
                                      {order.AddressContent?.split(',')[0] || 'Không có địa chỉ'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <CreditCard className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <p className="text-sm text-gray-500">Thanh toán</p>
                                    <p className="font-medium">{order.MethodName}</p>
                                    <p className="text-xs text-gray-500">{paymentStatus}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Products Preview */}
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  {Array.from({ length: Math.min(3, order.itemCount) }).map((_, idx) => (
                                    <div key={idx} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  ))}
                                  {order.itemCount > 3 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-white bg-orange-100 flex items-center justify-center">
                                      <span className="text-xs font-bold text-orange-700">+{order.itemCount - 3}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    {order.itemCount} sản phẩm
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.AddressContent?.split(',').slice(1).join(',').trim() || 'Đang cập nhật...'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                              <button
                                onClick={() => fetchOrderDetail(order.OrderId)}
                                className="px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition"
                              >
                                <Eye className="w-4 h-4" />
                                Xem chi tiết
                              </button>
                              
                              {actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={action.action}
                                  className={`px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${action.color}`}
                                >
                                  <action.icon className="w-4 h-4" />
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full border
                      transition-all duration-200
                      ${page === 1
                        ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                        : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
                    `}
                  >
                    <span className="text-lg">←</span>
                    <span className="text-sm font-medium">Trước</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`
                          w-9 h-9 rounded-full text-sm font-semibold
                          transition-all duration-200
                          ${page === i + 1
                            ? "bg-orange-500 text-white shadow"
                            : "bg-orange-50 text-orange-500 hover:bg-orange-200 cursor-pointer"}
                        `}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full border
                      transition-all duration-200
                      ${page === totalPages || totalPages === 0
                        ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                        : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
                    `}
                  >
                    <span className="text-sm font-medium">Sau</span>
                    <span className="text-lg">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showDetail && <OrderDetailModal />}

      <Footer />
    </>
  );
}