import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/Footer";
import Sidebar from "../../components/Buyer/Sidebar";
import { 
  Star, Edit, Trash2, Package, Filter, 
  Calendar, Search, AlertCircle
} from "lucide-react";

export default function MyFeedback() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    score: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10
  });
  
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMyFeedbacks();
  }, [filters.page, filters.score, filters.dateFrom, filters.dateTo]);

  const fetchMyFeedbacks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      setLoading(true);
      
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.score && { score: filters.score }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });
      
      const response = await axios.get(`/feedback/my-feedbacks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFeedbacks(response.data.feedbacks);
      setStats(response.data.stats);
      setTotalPages(response.data.pagination.totalPages);
      
    } catch (error) {
      console.error("Fetch feedbacks error:", error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("account");
        navigate("/login");
      } else {
        alert("Không thể tải danh sách đánh giá");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này?")) return;
    
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`/feedback/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Xóa đánh giá thành công");
      fetchMyFeedbacks();
      
    } catch (error) {
      console.error("Delete feedback error:", error);
      alert("Xóa đánh giá thất bại");
    }
  };

  const handleUpdateFeedback = async (feedbackId, newScore, newContent) => {
    // Có thể tạo modal chỉnh sửa ở đây
    navigate(`/feedback/edit/${feedbackId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const renderStars = (score) => {
    return Array(5).fill(0).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
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
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Đánh giá của tôi</h1>
                <p className="text-gray-600 mt-2">Quản lý tất cả đánh giá bạn đã viết</p>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-5 rounded-xl border">
                    <div className="text-sm text-gray-500">Tổng số đánh giá</div>
                    <div className="text-2xl font-bold text-gray-800 mt-2">{stats.total}</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border">
                    <div className="text-sm text-gray-500">Điểm trung bình</div>
                    <div className="text-2xl font-bold text-yellow-500 mt-2">
                      {stats.average}
                      <span className="text-lg ml-1">/5</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border">
                    <div className="text-sm text-gray-500">5 sao</div>
                    <div className="text-2xl font-bold text-green-600 mt-2">
                      {stats.distribution?.[5] || 0}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border">
                    <div className="text-sm text-gray-500">1 sao</div>
                    <div className="text-2xl font-bold text-red-600 mt-2">
                      {stats.distribution?.[1] || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="bg-white rounded-xl border p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lọc theo sao
                    </label>
                    <select
                      value={filters.score}
                      onChange={(e) => setFilters({ ...filters, score: e.target.value, page: 1 })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Tất cả</option>
                      <option value="5">5 sao</option>
                      <option value="4">4 sao</option>
                      <option value="3">3 sao</option>
                      <option value="2">2 sao</option>
                      <option value="1">1 sao</option>
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Đang tải đánh giá...</p>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Star className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có đánh giá nào</h3>
                  <p className="text-gray-500 mb-6">Bạn chưa viết đánh giá nào cho sản phẩm</p>
                  <button
                    onClick={() => navigate("/orders")}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
                  >
                    Đến đơn hàng để đánh giá
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.FeedbackId} className="bg-white rounded-xl border overflow-hidden">
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <img
                              src={feedback.ProductImage || "https://via.placeholder.com/80"}
                              alt={feedback.ProductName}
                              className="w-20 h-20 rounded-lg object-cover border"
                            />
                          </div>
                          
                          {/* Feedback Content */}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium text-gray-800">{feedback.ProductName}</h3>
                                <p className="text-sm text-gray-600 mt-1">{feedback.StallName}</p>
                                
                                {/* Stars */}
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex">
                                    {renderStars(feedback.Score)}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(feedback.CreatedAt)}
                                  </span>
                                </div>
                                
                                {/* Feedback Text */}
                                <p className="mt-3 text-gray-700">{feedback.Content}</p>
                                
                                {/* Feedback Image */}
                                {feedback.Image && (
                                  <div className="mt-3">
                                    <img
                                      src={feedback.Image.startsWith('http') 
                                        ? feedback.Image 
                                        : `http://localhost:3000${feedback.Image}`}
                                      alt="Feedback"
                                      className="h-40 rounded-lg object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleUpdateFeedback(feedback.FeedbackId)}
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteFeedback(feedback.FeedbackId)}
                                  className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                      disabled={filters.page === 1}
                      className={`px-3 py-1.5 rounded-lg ${
                        filters.page === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      Trước
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (filters.page <= 3) {
                        pageNum = i + 1;
                      } else if (filters.page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = filters.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setFilters({ ...filters, page: pageNum })}
                          className={`px-3 py-1.5 rounded-lg ${
                            filters.page === pageNum
                              ? "bg-orange-500 text-white"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                      disabled={filters.page === totalPages}
                      className={`px-3 py-1.5 rounded-lg ${
                        filters.page === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}