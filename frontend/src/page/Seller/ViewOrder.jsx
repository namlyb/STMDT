import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import Sidebar from "../../components/Seller/Sidebar";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  MapPin,
  Hash,
  Calendar,
  Eye,
  Check,
  AlertCircle,
  Download,
  User,
  Phone,
  ShoppingBag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShoppingCart,
  Printer
} from "lucide-react";

export default function ViewOrder() {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
    orderId: ""
  });
  
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [checkAll, setCheckAll] = useState(false);

  const fmt = n => Number(n || 0).toLocaleString("vi-VN");

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImageUrl = (imageName) => {
    if (!imageName) return "https://via.placeholder.com/80";
    if (imageName.startsWith('http')) return imageName;
    const baseUrl = "http://localhost:8080";
    return `${baseUrl}/uploads/ProductImage/${imageName}`;
  };

  const STATUS_MAP = {
    1: {
      label: "Chờ chuẩn bị",
      color: "bg-gray-100 text-gray-800",
      icon: Clock,
      bgColor: "bg-gray-50"
    },
    2: {
      label: "Đã chuẩn bị",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      bgColor: "bg-green-50"
    },
    3: {
      label: "Đang giao",
      color: "bg-purple-100 text-purple-800",
      icon: Truck,
      bgColor: "bg-purple-50"
    },
    4: {
      label: "Hoàn thành",
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle,
      bgColor: "bg-blue-50"
    },
    5: {
      label: "Đã hủy",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      bgColor: "bg-red-50"
    },
    7: {
      label: "Chờ gian hàng khác",
      color: "bg-orange-100 text-orange-800",
      icon: Clock,
      bgColor: "bg-orange-50"
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const account = JSON.parse(sessionStorage.getItem("account"));
      const token = sessionStorage.getItem("token");

      if (!account || !token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      
      const params = {
        status: filters.status === "all" ? "" : filters.status,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        orderId: filters.orderId
      };

      const response = await axios.get("/orders/seller/orders", {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data && Array.isArray(response.data)) {
        const formattedOrders = response.data.map(order => {
          const preparedCount = order.preparedCount || 0;
          const totalItems = order.itemCount || 0;

          return {
            ...order,
            CreatedAt: formatDate(order.CreatedAt),
            UpdatedAt: formatDate(order.UpdatedAt),
            OrderDate: formatDate(order.OrderDate),
            details: order.details?.map(detail => ({
              ...detail,
              Image: getImageUrl(detail.Image)
            })) || [],
            preparedCount: preparedCount,
            totalItems: totalItems,
            preparedPercentage: totalItems > 0 ? Math.round((preparedCount / totalItems) * 100) : 0,
            allPrepared: totalItems > 0 && preparedCount === totalItems,
            canShip: (order.OrderStatus === 2 || order.OrderStatus === 7) && preparedCount === totalItems && totalItems > 0
          };
        });

        setAllOrders(formattedOrders);
      } else {
        setAllOrders([]);
      }

    } catch (error) {
      console.error("Fetch orders error:", error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("account");
        navigate("/login");
      } else {
        alert(error.response?.data?.message || "Không thể tải danh sách đơn hàng");
      }
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filters, navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      if (filters.status !== "all" && String(order.OrderStatus) !== filters.status) {
        return false;
      }
      
      if (filters.orderId && !String(order.OrderId).includes(filters.orderId)) {
        return false;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        const orderDate = new Date(order.CreatedAt);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (orderDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (orderDate > toDate) return false;
        }
      }
      
      return true;
    });
  }, [allOrders, filters]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, page, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setDisplayedOrders(paginatedOrders);
  }, [paginatedOrders]);

  const handleShipping = async (orderId) => {
    if (!window.confirm("Xác nhận chuyển tất cả sản phẩm sang trạng thái đang giao?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      const response = await axios.put(`/orders/seller/orders/${orderId}/ship`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newStatus = response.data.newOrderStatus;
      
      if (newStatus === 3) {
        alert("Đơn hàng đã được chuyển sang trạng thái đang giao");
      } else if (newStatus === 7) {
        alert("Đã gửi hàng thành công. Đang chờ gian hàng khác vận chuyển...");
      }

      setAllOrders(prevOrders =>
        prevOrders.map(order =>
          order.OrderId === orderId
            ? { 
                ...order, 
                OrderStatus: newStatus,
                canShip: false
              }
            : order
        )
      );

      if (selectedOrder && selectedOrder.order.OrderId === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          order: { 
            ...prev.order, 
            OrderStatus: newStatus, 
            canShip: false 
          },
          details: prev.details.map(detail => ({
            ...detail,
            Status: detail.Status === 2 ? 3 : detail.Status
          }))
        }));
        setCheckAll(false);
      }
      
      setTimeout(() => fetchOrders(), 1000);
      setShowDetail(false);
      
    } catch (error) {
      console.error("Shipping error:", error);
      alert(error.response?.data?.message || "Không thể chuyển trạng thái đơn hàng");
    }
  };

  const fetchOrderDetail = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token");

      const response = await axios.get(`/orders/seller/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const order = response.data.order || {};
        const details = response.data.details || [];

        let totalFeeAmount = 0;
        let totalProductValue = 0;

        const detailsWithCalculations = details.map(detail => {
          const itemTotal = detail.UnitPrice * detail.Quantity;
          const feeAmount = detail.PlatformFeePercent
            ? Math.round(itemTotal * detail.PlatformFeePercent / 100)
            : 0;

          totalFeeAmount += feeAmount;
          totalProductValue += itemTotal;

          return {
            ...detail,
            Image: getImageUrl(detail.Image),
            itemTotal: itemTotal,
            feeAmount: feeAmount,
            finalPrice: itemTotal + detail.ShipFee,
            isPrepared: detail.Status === 2
          };
        });

        const revenue = totalProductValue - totalFeeAmount;
        const preparedCount = detailsWithCalculations.filter(d => d.Status === 2).length;
        const allPrepared = preparedCount === detailsWithCalculations.length && detailsWithCalculations.length > 0;

        setSelectedOrder({
          order: {
            ...order,
            CreatedAt: formatDate(order.CreatedAt),
            OrderDate: formatDate(order.OrderDate),
            canShip: (order.OrderStatus === 2 || order.OrderStatus === 7) && allPrepared,
            SubTotal: totalProductValue,
            TotalFee: totalFeeAmount,
            Revenue: revenue
          },
          details: detailsWithCalculations,
          itemCount: response.data.itemCount || 0,
          allPrepared: allPrepared
        });
        setCheckAll(allPrepared);
        setShowDetail(true);
      }
    } catch (error) {
      console.error("Fetch order detail error:", error);
      alert(error.response?.data?.message || "Không thể tải chi tiết đơn hàng");
    }
  };

  const handlePrepareItem = async (orderDetailId, currentStatus) => {
    try {
      const token = sessionStorage.getItem("token");
      
      // Kiểm tra trạng thái hiện tại
      const orderDetailResponse = await axios.get(`/orders/seller/order-details/${orderDetailId}/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orderDetail = orderDetailResponse.data;
      
      // Chỉ cho phép thay đổi khi status = 1 hoặc 2
      if (orderDetail.currentStatus >= 3) {
        alert("Không thể thay đổi trạng thái khi đã bắt đầu vận chuyển");
        return;
      }

      // Xác định trạng thái mới
      const isPrepared = currentStatus === 1; // Nếu đang là 1 thì chuyển sang 2, nếu đang là 2 thì chuyển về 1
      
      await axios.put(`/orders/seller/order-details/${orderDetailId}/prepare`, {
        isPrepared: isPrepared
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cập nhật state
      setAllOrders(prevOrders =>
        prevOrders.map(order => ({
          ...order,
          details: order.details?.map(detail =>
            detail.OrderDetailId === orderDetailId
              ? { ...detail, Status: isPrepared ? 2 : 1 }
              : detail
          )
        }))
      );

      if (selectedOrder) {
        const updatedDetails = selectedOrder.details.map(detail =>
          detail.OrderDetailId === orderDetailId
            ? { 
                ...detail, 
                Status: isPrepared ? 2 : 1, 
                isPrepared: isPrepared 
              }
            : detail
        );

        const preparedCount = updatedDetails.filter(d => d.Status === 2).length;
        const totalItems = updatedDetails.length;
        const allPrepared = preparedCount === totalItems && totalItems > 0;

        setSelectedOrder(prev => ({
          ...prev,
          details: updatedDetails,
          allPrepared: allPrepared,
          order: {
            ...prev.order,
            canShip: (prev.order.OrderStatus === 2 || prev.order.OrderStatus === 7) && allPrepared
          }
        }));
        setCheckAll(allPrepared);
      }

      alert(isPrepared ? "Đã đánh dấu đã chuẩn bị hàng" : "Đã bỏ đánh dấu chuẩn bị hàng");
      setTimeout(() => fetchOrders(), 500);

    } catch (error) {
      console.error("Update prepare status error:", error);
      alert(error.response?.data?.message || "Không thể cập nhật trạng thái chuẩn bị hàng");
    }
  };

  const handlePrepareAll = async () => {
  if (!selectedOrder) return;

  const token = sessionStorage.getItem("token");
  const shouldPrepare = !checkAll;

  try {
    // Lọc những sản phẩm có thể chuẩn bị
    const detailsToUpdate = selectedOrder.details.filter(detail => {
      // Chỉ xử lý sản phẩm có status 1 hoặc 2
      if (detail.Status === 1 || detail.Status === 2) {
        if (shouldPrepare) {
          // Chỉ chuẩn bị những sản phẩm đang chờ chuẩn bị (status = 1)
          return detail.Status === 1;
        } else {
          // Chỉ bỏ chuẩn bị những sản phẩm đã chuẩn bị (status = 2)
          return detail.Status === 2;
        }
      }
      return false;
    });

    if (detailsToUpdate.length === 0) {
      alert(shouldPrepare ? "Không có sản phẩm nào đang chờ chuẩn bị" : "Không có sản phẩm nào đã chuẩn bị");
      return;
    }

    const promises = detailsToUpdate.map(detail =>
      axios.put(`/orders/seller/order-details/${detail.OrderDetailId}/prepare`, {
        isPrepared: shouldPrepare
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );

    await Promise.all(promises);

    const updatedDetails = selectedOrder.details.map(detail => {
      if (detailsToUpdate.some(d => d.OrderDetailId === detail.OrderDetailId)) {
        return {
          ...detail,
          Status: shouldPrepare ? 2 : 1,
          isPrepared: shouldPrepare
        };
      }
      return detail;
    });

    const preparedCount = updatedDetails.filter(d => d.Status === 2).length;
    const totalItems = updatedDetails.filter(d => d.Status === 1 || d.Status === 2).length;
    const allPrepared = preparedCount === totalItems && totalItems > 0;

    setSelectedOrder(prev => ({
      ...prev,
      details: updatedDetails,
      allPrepared: allPrepared,
      order: {
        ...prev.order,
        canShip: (prev.order.OrderStatus === 2 || prev.order.OrderStatus === 7) && allPrepared
      }
    }));

    setCheckAll(allPrepared);

    alert(shouldPrepare ? "Đã đánh dấu tất cả sản phẩm đã chuẩn bị" : "Đã bỏ đánh dấu tất cả sản phẩm");
    setTimeout(() => fetchOrders(), 500);

  } catch (error) {
    console.error("Prepare all error:", error);
    alert(error.response?.data?.message || "Không thể cập nhật trạng thái");
  }
};

  const handleComplete = async (orderDetailId) => {
    if (!window.confirm("Xác nhận đã giao hàng thành công?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");

      await axios.put(`/orders/seller/order-details/${orderDetailId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Đã xác nhận giao hàng thành công");
      fetchOrders();
      setShowDetail(false);
    } catch (error) {
      console.error("Complete error:", error);
      alert(error.response?.data?.message || "Không thể xác nhận giao hàng");
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const renderStatusBadge = (status, size = "normal") => {
    const statusInfo = STATUS_MAP[status] || {
      label: "Không xác định",
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle
    };
    const Icon = statusInfo.icon;
    const sizeClass = size === "small" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </span>
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToCSV = () => {
    const headers = [
      "Mã đơn",
      "Ngày đặt",
      "Khách hàng",
      "SĐT",
      "Trạng thái",
      "Tổng tiền",
      "Số SP",
      "Đã chuẩn bị",
      "Địa chỉ"
    ];

    const data = displayedOrders.map(order => [
      order.OrderId,
      order.OrderDate,
      order.CustomerName,
      order.CustomerPhone,
      STATUS_MAP[order.OrderStatus]?.label || "Không xác định",
      `${fmt(order.FinalPrice)}đ`,
      order.itemCount || 0,
      `${order.preparedPercentage}%`,
      order.AddressContent ? order.AddressContent.substring(0, 50) + "..." : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...data.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `don-hang-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatsCards = () => {
    const stats = {
      total: filteredOrders.length,
      processing: filteredOrders.filter(o => o.OrderStatus === 2).length,
      shipping: filteredOrders.filter(o => o.OrderStatus === 3).length,
      completed: filteredOrders.filter(o => o.OrderStatus === 4).length,
      waiting: filteredOrders.filter(o => o.OrderStatus === 7).length
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng đơn hàng</p>
              <p className="text-2xl font-bold text-gray-800">{fmt(stats.total)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang xử lý</p>
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Chờ gian hàng khác</p>
              <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang giao</p>
              <p className="text-2xl font-bold text-purple-600">{stats.shipping}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Truck className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    const { order, details } = selectedOrder;
    const totalItems = details.length;

    const preparedCount = details.filter(d => d.Status === 2).length;
    const currentAllPrepared = preparedCount === totalItems && totalItems > 0;

    const totalProductValue = details.reduce((sum, detail) => sum + detail.itemTotal, 0);
    const totalFeeAmount = details.reduce((sum, detail) => sum + (detail.feeAmount || 0), 0);
    const revenue = totalProductValue - totalFeeAmount;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => setShowDetail(false)}
        ></div>

        <div className="relative bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto z-10">
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
                {renderStatusBadge(order.OrderStatus)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                In đơn
              </button>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 hover:bg-gray-100 cursor-pointer rounded-lg transition"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Địa chỉ giao hàng</h4>
                </div>

                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Tên người nhận: </span>
                    {order.AddressName}
                  </p>

                  <p>
                    <span className="font-medium">Số điện thoại: </span>
                    {order.AddressPhone}
                  </p>

                  <p>
                    <span className="font-medium">Địa chỉ: </span>
                    {order.AddressContent}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-gray-500" />
                  <h4 className="font-semibold text-gray-800">Sản phẩm trong đơn ({totalItems})</h4>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {preparedCount}/{totalItems} sản phẩm đã chuẩn bị
                  </span>
                  <div className={`px-3 py-1 text-sm rounded-lg ${currentAllPrepared ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {currentAllPrepared ? 'Đã sẵn sàng giao' : 'Đang chuẩn bị'}
                  </div>
                </div>
              </div>

              {(order.OrderStatus === 2 || order.OrderStatus === 7) && (
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="checkAll"
                      checked={checkAll}
                      onChange={handlePrepareAll}
                      className="w-5 h-5 text-blue-600 bg-gray-100 cursor-pointer border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="checkAll" className="ml-2 text-sm font-medium text-gray-900">
                      {`Chọn tất cả (${details.filter(d => d.Status === 1).length} sản phẩm có thể chuẩn bị)`}
                    </label>
                  </div>
                </div>
              )}
              <div className="divide-y">
                {details.map((detail, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 pt-2">
                        {/* Hiển thị checkbox chỉ cho sản phẩm chưa vận chuyển */}
                        {(order.OrderStatus === 2 || order.OrderStatus === 7) && 
                         (detail.Status === 1 || detail.Status === 2) && (
                          <button
                            onClick={() => handlePrepareItem(detail.OrderDetailId, detail.Status)}
                            className={`w-6 h-6 rounded border-2 cursor-pointer flex items-center justify-center transition ${detail.Status === 2
                                ? 'bg-green-100 border-green-500'
                                : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                              }`}
                            title={detail.Status === 2 ? "Đã chuẩn bị - Nhấn để bỏ" : "Chưa chuẩn bị - Nhấn để đánh dấu"}
                          >
                            {detail.Status === 2 && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </button>
                        )}
                        {/* Hiển thị icon cho các trạng thái khác */}
                        {detail.Status === 3 && (
                          <div className="w-6 h-6 rounded bg-purple-100 border-2 border-purple-500 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                        {detail.Status === 4 && (
                          <div className="w-6 h-6 rounded bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        {detail.Status === 5 && (
                          <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-500 flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </div>

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

                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-blue-600">
                                Phí ship: {fmt(detail.ShipFee)}đ
                              </span>
                              {detail.PlatformFeePercent && (
                                <span className="text-purple-600">
                                  Phí sàn: {detail.PlatformFeePercent}% ({fmt(detail.feeAmount)}đ)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-red-500">
                              {fmt(detail.finalPrice)}đ
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs mt-2 ${STATUS_MAP[detail.Status]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {STATUS_MAP[detail.Status]?.label || 'Không xác định'}
                            </div>
                            {detail.Status === 2 && (
                              <div className="text-xs text-green-600 mt-1">
                                ✓ Đã chuẩn bị
                              </div>
                            )}
                            {detail.Status === 3 && (
                              <div className="text-xs text-purple-600 mt-1">
                                ✓ Đang giao hàng
                              </div>
                            )}
                            {detail.Status === 4 && (
                              <div className="text-xs text-blue-600 mt-1">
                                ✓ Đã giao hàng
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalItems || 0}</div>
                  <p className="text-sm text-gray-600">Số sản phẩm</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{fmt(totalProductValue)}đ</div>
                  <p className="text-sm text-gray-600">Tổng tiền hàng</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{fmt(totalFeeAmount)}đ</div>
                  <p className="text-sm text-gray-600">Phí sàn</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{fmt(revenue)}đ</div>
                  <p className="text-sm text-gray-600">Doanh thu</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {(order.OrderStatus === 2 || order.OrderStatus === 7) && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Click vào ô vuông để đánh dấu/bỏ đánh dấu sản phẩm đã chuẩn bị xong</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-6 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Đóng
                </button>

                {(order.OrderStatus === 2 || order.OrderStatus === 7) && currentAllPrepared && (
                  <button
                    onClick={() => handleShipping(order.OrderId)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Gửi hàng ngay
                  </button>
                )}
              </div>
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
            <div className="hidden md:block w-64">
              <Sidebar />
            </div>

            <div className="flex-1">
              <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">Quản lý đơn hàng</h1>
                    <p className="text-gray-600 mt-2">Xem và quản lý đơn hàng từ khách hàng</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToCSV}
                      className="px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Xuất CSV
                    </button>
                    <button
                      onClick={fetchOrders}
                      className="px-4 py-2 bg-blue-600 cursor-pointer text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Làm mới
                    </button>
                  </div>
                </div>
              </div>

              <StatsCards />

              <div className="bg-white rounded-xl border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                    <select
                      className="w-full p-2.5 border cursor-pointer rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.status}
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="2">Đang xử lý</option>
                      <option value="7">Chờ gian hàng khác</option>
                      <option value="3">Đang giao</option>
                      <option value="4">Hoàn thành</option>
                      <option value="5">Đã hủy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mã đơn hàng</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="VD: 1234"
                        value={filters.orderId || ""}
                        onChange={(e) => handleFilterChange("orderId", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                    <input
                      type="date"
                      className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                      max={filters.dateTo || new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                    <input
                      type="date"
                      className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                      min={filters.dateFrom || ""}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      setFilters({ status: "all", search: "", dateFrom: "", dateTo: "", orderId: "" });
                    }}
                    className="px-4 py-2 text-gray-600 cursor-pointer hover:text-gray-800 transition flex items-center gap-2"
                  >
                    <span>Xóa bộ lọc</span>
                  </button>
                  <div className="text-sm text-gray-600">
                    Tổng: <span className="font-semibold text-blue-500">{filteredOrders.length}</span> đơn hàng
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Đang tải đơn hàng...</p>
                </div>
              ) : displayedOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có đơn hàng</h3>
                  <p className="text-gray-500">Không tìm thấy đơn hàng nào phù hợp với bộ lọc</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedOrders.map(order => {
                    const isExpanded = expandedOrders.has(order.OrderId);

                    return (
                      <div key={order.OrderId} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition">
                        <div
                          className="p-6 border-b cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleOrderExpansion(order.OrderId)}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-400" />
                                <span className="font-mono font-bold text-gray-800">#{order.OrderId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{order.CreatedAt}</span>
                              </div>
                              {renderStatusBadge(order.OrderStatus)}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-red-500">{fmt(order.FinalPrice)}đ</span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-6 border-t">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-2">Thông tin khách hàng</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="font-medium">{order.CustomerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <a href={`tel:${order.CustomerPhone}`} className="text-blue-600 hover:underline">
                                        {order.CustomerPhone}
                                      </a>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-2">Địa chỉ giao hàng</h4>
                                  <div className="space-y-1">
                                    <p className="font-medium">{order.AddressName}</p>
                                    <p className="text-gray-600 text-sm">{order.AddressPhone}</p>
                                    <p className="text-gray-600 text-sm">{order.AddressContent}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="lg:col-span-2">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Sản phẩm ({order.totalItems || 0})</h4>
                                <div className="space-y-3">
                                  {order.details?.slice(0, 3).map((detail, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                                      <div className="relative">
                                        <img
                                          src={detail.Image}
                                          alt={detail.ProductName}
                                          className="w-10 h-10 rounded object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://via.placeholder.com/40";
                                          }}
                                        />
                                        {(order.OrderStatus === 2 || order.OrderStatus === 7) && 
                                         (detail.Status === 1 || detail.Status === 2) && (
                                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white ${detail.Status === 2 ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            {detail.Status === 2 && (
                                              <Check className="w-3 h-3 text-white" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm truncate">{detail.ProductName}</p>
                                        <p className="text-xs text-gray-500">
                                          {detail.Quantity} × {fmt(detail.UnitPrice)}đ
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium">
                                          {fmt(detail.UnitPrice * detail.Quantity)}đ
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {renderStatusBadge(detail.Status, "small")}
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {(order.totalItems || 0) > 3 && (
                                    <div className="text-center text-sm text-gray-500">
                                      + {(order.totalItems || 0) - 3} sản phẩm khác
                                    </div>
                                  )}

                                  {(order.OrderStatus === 2 || order.OrderStatus === 7) && (
                                    <div className="mt-4">
                                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Tiến độ chuẩn bị</span>
                                        <span>{order.preparedCount || 0}/{order.totalItems || 0}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${order.preparedPercentage || 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <button
                                  onClick={() => fetchOrderDetail(order.OrderId)}
                                  className="w-full px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                  Xem chi tiết
                                </button>

                                {(order.OrderStatus === 2 || order.OrderStatus === 7) && order.canShip && (
                                  <button
                                    onClick={() => handleShipping(order.OrderId)}
                                    className="w-full px-4 py-2 bg-blue-600 text-white cursor-pointer rounded-lg flex items-center justify-center gap-2 transition hover:bg-blue-700"
                                  >
                                    <Truck className="w-4 h-4" />
                                    Gửi hàng ngay
                                  </button>
                                )}

                                {(order.OrderStatus === 2 || order.OrderStatus === 7) && !order.canShip && (
                                  <div className="text-sm text-gray-500 text-center p-2">
                                    {order.preparedCount === 0 ? "Chưa có sản phẩm nào được chuẩn bị" : 
                                     `Cần chuẩn bị thêm ${order.totalItems - order.preparedCount} sản phẩm`}
                                  </div>
                                )}

                                <button
                                  onClick={() => navigate(`/seller/chat`)}
                                  className="w-full px-4 py-2 border border-blue-300 cursor-pointer text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 transition"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  Nhắn tin
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full border
                      transition-all duration-200
                      ${page === 1
                        ? "bg-blue-100 text-blue-300 border-blue-200 cursor-not-allowed"
                        : "bg-white text-blue-500 border-blue-300 hover:bg-blue-300 hover:text-white shadow-sm cursor-pointer"}
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
                            ? "bg-blue-500 text-white shadow"
                            : "bg-blue-50 text-blue-500 hover:bg-blue-200 cursor-pointer"}
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
                        ? "bg-blue-100 text-blue-300 border-blue-200 cursor-not-allowed"
                        : "bg-white text-blue-500 border-blue-300 hover:bg-blue-300 hover:text-white shadow-sm cursor-pointer"}
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

      {showDetail && <OrderDetailModal />}

      <Footer />
    </>
  );
}