import { useState, useEffect } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/Footer";

const ManageOrder = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [filter, setFilter] = useState({
    status: "3",
    search: "",
    dateFrom: "",
    dateTo: ""
  });
  
  // State cho toast message
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success"
  });

  // Thêm useEffect để fetch data khi component mount
  useEffect(() => {
    fetchOrders();
    // Reset chi tiết khi load lại trang
    resetOrderDetails();
  }, []);

  // Hiển thị toast message
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // Status mapping
  const detailStatusLabels = {
    1: "Chờ chuẩn bị",
    2: "Đã chuẩn bị",
    3: "Đang giao",
    4: "Đã giao",
    5: "Đã hủy",
    6: "Trả hàng"
  };

  const detailStatusColors = {
    1: "bg-yellow-100 text-yellow-800",
    2: "bg-blue-100 text-blue-800",
    3: "bg-purple-100 text-purple-800",
    4: "bg-green-100 text-green-800",
    5: "bg-red-100 text-red-800",
    6: "bg-gray-100 text-gray-800"
  };

  // Reset chi tiết đơn hàng
  const resetOrderDetails = () => {
    setSelectedOrder(null);
    setOrderDetails([]);
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        status: filter.status,
        search: filter.search,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo
      });

      const res = await axios.get(`/orders/staff/orders?${params}`);
      console.log("Orders API response:", res.data);
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showToast("Lỗi khi tải danh sách đơn hàng", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch order details
  const fetchOrderDetails = async (orderId) => {
    try {
      // Reset completed order nếu có
      setCompletedOrder(null);
      
      const res = await axios.get(`/orders/staff/orders/${orderId}`);
      console.log("Order details API response:", res.data);
      
      // Kiểm tra nếu không có chi tiết
      if (!res.data.details || res.data.details.length === 0) {
        showToast("Đơn hàng này không có sản phẩm nào", "info");
        resetOrderDetails();
        return;
      }
      
      // Kiểm tra xem có sản phẩm nào đang giao không
      const shippingItems = res.data.details.filter(item => item.Status === 3);
      if (shippingItems.length === 0) {
        showToast("Đơn hàng này không có sản phẩm nào đang giao", "info");
        resetOrderDetails();
        return;
      }
      
      setOrderDetails(res.data.details);
      setSelectedOrder(orderId);
    } catch (error) {
      console.error("Error fetching order details:", error);
      showToast("Lỗi khi tải chi tiết đơn hàng", "error");
      resetOrderDetails();
    }
  };

  // Xác nhận đã giao hàng
  const confirmDelivery = async (orderDetailId) => {
    try {
      const confirm = window.confirm("Xác nhận đã giao hàng thành công?");
      if (!confirm) return;

      await axios.put(`/orders/staff/order-details/${orderDetailId}/deliver`);
      
      // Cập nhật trạng thái cục bộ
      const updatedOrderDetails = orderDetails.map(item => 
        item.OrderDetailId === orderDetailId 
          ? { ...item, Status: 4 } 
          : item
      );
      
      setOrderDetails(updatedOrderDetails);
      showToast("Đã xác nhận giao hàng thành công!");
      
      // Kiểm tra nếu tất cả sản phẩm đã giao thì hoàn thành đơn hàng
      const allDelivered = updatedOrderDetails.every(item => item.Status === 4);
      if (allDelivered) {
        setCompletedOrder(selectedOrder);
        setTimeout(() => {
          showToast(`Đơn hàng #${selectedOrder} đã hoàn thành!`);
          // Reset và refresh
          resetOrderDetails();
          fetchOrders();
        }, 1500);
      }
      
    } catch (error) {
      console.error("Error confirming delivery:", error);
      showToast(error.response?.data?.message || "Không thể xác nhận giao hàng", "error");
    }
  };

  // Xác nhận tất cả sản phẩm trong đơn hàng
  const confirmAllDelivery = async () => {
    try {
      const confirm = window.confirm("Xác nhận tất cả sản phẩm đã được giao?");
      if (!confirm) return;

      await axios.put(`/orders/staff/orders/${selectedOrder}/deliver-all`);
      
      // Cập nhật trạng thái cục bộ cho tất cả sản phẩm
      const allCompletedDetails = orderDetails.map(item => ({
        ...item,
        Status: 4
      }));
      
      setOrderDetails(allCompletedDetails);
      showToast("Đã xác nhận tất cả sản phẩm!");
      
      // Đánh dấu đơn hàng đã hoàn thành
      setCompletedOrder(selectedOrder);
      
      // Sau 1.5 giây, reset hoàn toàn và refresh
      setTimeout(() => {
        showToast(`Đơn hàng #${selectedOrder} đã hoàn thành!`);
        resetOrderDetails();
        fetchOrders();
      }, 1500);
      
    } catch (error) {
      console.error("Error confirming all delivery:", error);
      showToast(error.response?.data?.message || "Lỗi khi xác nhận", "error");
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Handler cho apply filter
  const handleApplyFilter = () => {
    setLoading(true);
    resetOrderDetails();
    setCompletedOrder(null);
    fetchOrders();
  };

  // Handler cho click vào đơn hàng
  const handleOrderClick = (orderId) => {
    resetOrderDetails();
    setCompletedOrder(null);
    fetchOrderDetails(orderId);
  };

  // Tính toán số liệu thống kê
  const calculateStats = () => {
    const totalProducts = orderDetails.reduce((sum, item) => sum + item.Quantity, 0);
    const shippingProducts = orderDetails.filter(item => item.Status === 3).length;
    const deliveredProducts = orderDetails.filter(item => item.Status === 4).length;
    const totalAmount = orderDetails.reduce((sum, item) => sum + (item.UnitPrice * item.Quantity), 0);
    
    return {
      totalProducts,
      shippingProducts,
      deliveredProducts,
      totalAmount
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
            <div className="flex items-center">
              {toast.type === "success" ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        )}
        
        {/* Main Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Quản lý đơn hàng đang giao</h1>
            <p className="text-gray-600 mt-2">Xác nhận đơn hàng đã được giao đến khách hàng</p>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  placeholder="Mã đơn hàng, tên khách hàng..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter({...filter, dateFrom: e.target.value})}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.dateTo}
                  onChange={(e) => setFilter({...filter, dateTo: e.target.value})}
                />
              </div>

              {/* Actions */}
              <div className="flex items-end">
                <button
                  onClick={handleApplyFilter}
                  disabled={refreshing}
                  className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tải...
                    </>
                  ) : (
                    "Áp dụng bộ lọc"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content với grid 12 columns */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Orders List - 4 columns */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-6">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Đơn hàng đang giao
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {orders.length} đơn
                    </span>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      <p>Không có đơn hàng nào đang vận chuyển</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.OrderId}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedOrder === order.OrderId ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                        }`}
                        onClick={() => handleOrderClick(order.OrderId)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-800">
                                #{order.OrderId}
                              </h3>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {order.itemCount} sp
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-1">
                              {order.CustomerName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {order.CustomerPhone}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-gray-900 block">
                              {formatCurrency(order.FinalPrice)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(order.OrderDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column: Order Details - 8 columns */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                {completedOrder ? (
                  <div className="p-12 text-center">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-8 max-w-md mx-auto">
                      <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <h3 className="text-xl font-bold text-green-800 mb-2">Hoàn thành!</h3>
                      <p className="text-green-600 mb-6">
                        Đơn hàng #{completedOrder} đã được xác nhận giao hàng thành công.
                      </p>
                      <button
                        onClick={() => {
                          setCompletedOrder(null);
                          resetOrderDetails();
                        }}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Xem đơn hàng khác
                      </button>
                    </div>
                  </div>
                ) : selectedOrder && orderDetails.length > 0 ? (
                  <>
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-gray-800">
                              Chi tiết đơn hàng #{selectedOrder}
                            </h2>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {orderDetails.length} sản phẩm
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                              </svg>
                              <span className="text-gray-600">{orderDetails[0]?.CustomerName}</span>
                            </div>
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                              </svg>
                              <span className="text-gray-600">{orderDetails[0]?.CustomerPhone}</span>
                            </div>
                          </div>
                        </div>
                        
                        {orderDetails.some(item => item.Status === 3) && (
                          <button
                            onClick={confirmAllDelivery}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center whitespace-nowrap"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Xác nhận tất cả
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Products List */}
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sản phẩm
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Số lượng
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Đơn giá
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng thái
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hành động
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orderDetails.map((item) => (
                              <tr key={item.OrderDetailId} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {item.Image && (
                                      <img
                                        src={item.Image.startsWith('http') ? item.Image : `http://localhost:8080/uploads/ProductImage/${item.Image}`}
                                        alt={item.ProductName}
                                        className="w-12 h-12 object-cover rounded-lg mr-3"
                                        onError={(e) => {
                                          e.target.src = "https://via.placeholder.com/48x48?text=No+Image";
                                        }}
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium text-gray-900 mb-1">
                                        {item.ProductName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.StallName}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="font-medium bg-gray-100 px-2 py-1 rounded">
                                    {item.Quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="font-medium">
                                    {formatCurrency(item.UnitPrice)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${detailStatusColors[item.Status] || 'bg-gray-100 text-gray-800'}`}>
                                    {detailStatusLabels[item.Status] || `Trạng thái ${item.Status}`}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {item.Status === 3 ? (
                                    <button
                                      onClick={() => confirmDelivery(item.OrderDetailId)}
                                      className="bg-green-100 text-green-800 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors flex items-center text-sm"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      Đã giao
                                    </button>
                                  ) : item.Status === 4 ? (
                                    <span className="text-green-600 font-medium flex items-center text-sm">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                      Đã xác nhận
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Không thể thao tác</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary */}
                      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng sản phẩm</p>
                            <p className="font-medium text-lg">
                              {stats.totalProducts} sản phẩm
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Đang vận chuyển</p>
                            <p className="font-medium text-lg text-blue-600">
                              {stats.shippingProducts} sản phẩm
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Đã giao</p>
                            <p className="font-medium text-lg text-green-600">
                              {stats.deliveredProducts} sản phẩm
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng tiền</p>
                            <p className="font-medium text-lg">
                              {formatCurrency(stats.totalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Chọn một đơn hàng
                    </h3>
                    <p className="text-gray-500">
                      Chọn đơn hàng từ danh sách bên trái để xem chi tiết và xác nhận giao hàng
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ManageOrder;