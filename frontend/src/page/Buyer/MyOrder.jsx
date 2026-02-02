import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import Sidebar from "../../components/Buyer/Sidebar";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  Home,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Eye,
  MessageCircle,
  Star,
  CreditCard,
  XCircle,
  RotateCcw,
  ShoppingBag,
  Calendar,
  MapPin,
  DollarSign,
  Hash
} from "lucide-react";

export default function MyOrder() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fmt = n => Number(n || 0).toLocaleString("vi-VN");

  // Định nghĩa các trạng thái
  const STATUS_MAP = {
    1: { label: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    2: { label: "Đang xử lý", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
    3: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: Truck },
    4: { label: "Hoàn thành", color: "bg-green-100 text-green-800", icon: CheckCircle },
    5: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: XCircle },
    6: { label: "Trả hàng", color: "bg-orange-100 text-orange-800", icon: RotateCcw }
  };

  // Tab phân loại
  const TABS = [
    { id: "all", label: "Tất cả", count: 0 },
    { id: "1", label: "Chờ thanh toán", count: 0 },
    { id: "2", label: "Đang xử lý", count: 0 },
    { id: "3", label: "Đang giao", count: 0 },
    { id: "4", label: "Hoàn thành", count: 0 },
    { id: "5", label: "Đã hủy", count: 0 },
    { id: "6", label: "Trả hàng", count: 0 }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
  try {
    const account = JSON.parse(sessionStorage.getItem("account"));
    const token = sessionStorage.getItem("token"); // Lấy token
    
    if (!account || !token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    
    // Thêm Authorization header
    const response = await axios.get("/orders/my-orders", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Format dates
    const formattedOrders = response.data.map(order => ({
      ...order,
      CreatedAt: new Date(order.CreatedAt).toLocaleDateString("vi-VN"),
      UpdatedAt: new Date(order.UpdatedAt).toLocaleDateString("vi-VN"),
      OrderDate: new Date(order.OrderDate).toLocaleDateString("vi-VN")
    }));
    
    setOrders(formattedOrders);
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

const fetchOrderDetail = async (orderId) => {
  try {
    const token = sessionStorage.getItem("token"); // Lấy token
    
    const response = await axios.get(`/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setSelectedOrder(response.data);
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

  const getFilteredOrders = () => {
    if (activeTab === "all") return orders;
    return orders.filter(order => order.Status === parseInt(activeTab));
  };

  // Tính toán số lượng cho mỗi tab
  const calculateTabCounts = () => {
    const counts = { all: orders.length };
    TABS.forEach(tab => {
      if (tab.id !== "all") {
        counts[tab.id] = orders.filter(order => order.Status === parseInt(tab.id)).length;
      }
    });
    return counts;
  };

  const renderStatusBadge = (status) => {
    const statusInfo = STATUS_MAP[status] || { label: "Không xác định", color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-4 h-4" />
        {statusInfo.label}
      </span>
    );
  };

  const getOrderActions = (order) => {
    const actions = [];
    
    switch (order.Status) {
      case 1: // Chờ thanh toán
        actions.push(
          { label: "Thanh toán", action: () => handlePay(order.OrderId), icon: CreditCard, color: "bg-green-600 cursor-pointer hover:bg-green-700" },
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

  const handlePay = async (orderId) => {
    // Implement payment logic
    console.log("Payment for order:", orderId);
  };

  const handleCancel = async (orderId) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
      try {
        await axios.put(`/orders/${orderId}/cancel`);
        alert("Đã hủy đơn hàng thành công");
        fetchOrders();
      } catch (error) {
        alert("Không thể hủy đơn hàng");
      }
    }
  };

  const handleContact = (orderId) => {
    // Navigate to chat with seller
    navigate(`/chat?order=${orderId}`);
  };

  const handleReorder = async (orderId) => {
    try {
      const response = await axios.post(`/orders/${orderId}/reorder`);
      alert("Đã thêm sản phẩm vào giỏ hàng");
      navigate("/cart");
    } catch (error) {
      alert("Không thể mua lại đơn hàng này");
    }
  };

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    const { order, details } = selectedOrder;
    const StatusIcon = STATUS_MAP[order.Status]?.icon || AlertCircle;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                {renderStatusBadge(order.Status)}
              </div>
            </div>
            <button
              onClick={() => setShowDetail(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XCircle className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-8">
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
                        {STATUS_MAP[step]?.label || `Bước ${step}`}
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
                  <p className="text-gray-600">Trạng thái: {order.Status === 4 ? "Đã thanh toán" : "Chờ thanh toán"}</p>
                  <p className="text-lg font-bold text-red-500">{fmt(order.FinalPrice)}đ</p>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <h4 className="font-semibold text-gray-800">Sản phẩm</h4>
              </div>
              <div className="divide-y">
                {details?.map((detail, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex gap-4">
                      <img
                        src={detail.Image || "https://via.placeholder.com/80"}
                        alt={detail.ProductName}
                        className="w-20 h-20 rounded-lg object-cover border"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h5 className="font-medium text-gray-800">{detail.ProductName}</h5>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>Đơn giá: {fmt(detail.UnitPrice)}đ</span>
                              <span>•</span>
                              <span>Số lượng: {detail.Quantity}</span>
                              <span>•</span>
                              <span>Tổng: {fmt(detail.UnitPrice * detail.Quantity)}đ</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-blue-600">Phí ship: {fmt(detail.ShipFee)}đ</span>
                              <span className="text-purple-600">Phí sàn: {detail.PlatformFeePercent}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${STATUS_MAP[detail.Status]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_MAP[detail.Status]?.label || 'Không xác định'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng:</span>
                      <span>{fmt(details?.reduce((sum, d) => sum + d.UnitPrice * d.Quantity, 0) || 0)}đ</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Phí vận chuyển:</span>
                      <span>{fmt(details?.reduce((sum, d) => sum + d.ShipFee, 0) || 0)}đ</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Phí sàn:</span>
                      <span>{fmt(details?.reduce((sum, d) => sum + Math.floor(d.UnitPrice * d.Quantity * (d.PlatformFeePercent || 0) / 100), 0) || 0)}đ</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Tổng thanh toán:</span>
                        <span className="text-red-500">{fmt(order.FinalPrice)}đ</span>
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
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              {getOrderActions(order).map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 ${action.color}`}
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

  const tabCounts = calculateTabCounts();

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
                      className={`flex-shrink-0 px-6 py-4 border-b-2 font-medium transition ${activeTab === tab.id
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
              ) : getFilteredOrders().length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có đơn hàng</h3>
                  <p className="text-gray-500 mb-6">Bạn chưa có đơn hàng nào trong mục này</p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Mua sắm ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredOrders().map(order => {
                    const actions = getOrderActions(order);
                    
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
                              {renderStatusBadge(order.Status)}
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
                                  </div>
                                </div>
                              </div>

                              {/* Products Preview */}
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  {Array.from({ length: Math.min(3, 1) }).map((_, idx) => (
                                    <div key={idx} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    {1} sản phẩm
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
                                className="px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Xem chi tiết
                              </button>
                              
                              {actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={action.action}
                                  className={`px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 ${action.color}`}
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

              {/* Pagination (if needed) */}
              {getFilteredOrders().length > 0 && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center gap-2">
                    <button className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                      ← Trước
                    </button>
                    {[1, 2, 3].map(page => (
                      <button
                        key={page}
                        className={`px-3 py-2 border rounded-lg ${page === 1
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                      Sau →
                    </button>
                  </nav>
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