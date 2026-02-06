import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Calendar, Package, Image as ImageIcon, Trash2, Edit, Filter } from "lucide-react";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import Sidebar from "../../components/Buyer/Sidebar";
import axios from "../../components/lib/axios";

export default function MyFeedback() {
  const navigate = useNavigate();
  
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Lấy danh sách đánh giá
  const fetchFeedbacks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get('/feedbacks/my-feedbacks', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const formattedFeedbacks = response.data.map(fb => ({
        ...fb,
        CreatedAt: new Date(fb.CreatedAt).toLocaleDateString('vi-VN'),
        Images: fb.Image ? [fb.Image] : []
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("account");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [navigate]);

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(fb => {
    if (filter === "all") return true;
    return fb.Score === parseInt(filter);
  });

  // Bắt đầu chỉnh sửa
  const startEdit = (feedback) => {
    setEditingId(feedback.FeedbackId);
    setEditForm({
      score: feedback.Score,
      content: feedback.Content
    });
  };

  // Hủy chỉnh sửa
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Cập nhật đánh giá
  const updateFeedback = async (feedbackId) => {
    try {
      if (!editForm.content?.trim()) {
        alert("Vui lòng nhập nội dung đánh giá");
        return;
      }

      setSubmitting(true);
      const token = sessionStorage.getItem("token");

      await axios.put(`/feedbacks/${feedbackId}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cập nhật local state
      setFeedbacks(prev => prev.map(fb => 
        fb.FeedbackId === feedbackId 
          ? { 
              ...fb, 
              Score: editForm.score, 
              Content: editForm.content,
              UpdatedAt: new Date().toLocaleDateString('vi-VN')
            } 
          : fb
      ));

      setEditingId(null);
      setEditForm({});
      alert("Cập nhật đánh giá thành công!");
      
    } catch (error) {
      console.error("Update feedback error:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa đánh giá
  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`/feedbacks/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cập nhật local state
      setFeedbacks(prev => prev.filter(fb => fb.FeedbackId !== feedbackId));
      alert("Đã xóa đánh giá thành công!");
      
    } catch (error) {
      console.error("Delete feedback error:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá');
    }
  };

  // Render rating stars
  const renderStars = (score, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          interactive ? (
            <button
              key={star}
              type="button"
              onClick={() => onChange && onChange(star)}
              className="cursor-pointer focus:outline-none"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= score
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-200 text-gray-300"
                }`}
              />
            </button>
          ) : (
            <Star
              key={star}
              className={`w-6 h-6 ${
                star <= score
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              }`}
            />
          )
        ))}
      </div>
    );
  };

  // Statistics
  const stats = {
    total: feedbacks.length,
    average: feedbacks.length > 0 
      ? (feedbacks.reduce((sum, fb) => sum + fb.Score, 0) / feedbacks.length).toFixed(1)
      : 0,
    distribution: {
      5: feedbacks.filter(fb => fb.Score === 5).length,
      4: feedbacks.filter(fb => fb.Score === 4).length,
      3: feedbacks.filter(fb => fb.Score === 3).length,
      2: feedbacks.filter(fb => fb.Score === 2).length,
      1: feedbacks.filter(fb => fb.Score === 1).length
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Đang tải đánh giá...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

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
                <p className="text-gray-600 mt-2">Xem và quản lý các đánh giá bạn đã đăng</p>
              </div>

              {/* Statistics */}
              <div className="bg-white rounded-xl border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border-r">
                    <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-600">Tổng số đánh giá</div>
                  </div>
                  <div className="text-center p-4 border-r">
                    <div className="text-3xl font-bold text-gray-800">{stats.average}</div>
                    <div className="text-sm text-gray-600">Điểm trung bình</div>
                  </div>
                  <div className="text-center p-4 border-r">
                    <div className="text-3xl font-bold text-green-600">{stats.distribution[5]}</div>
                    <div className="text-sm text-gray-600">5 sao</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-3xl font-bold text-red-500">{stats.distribution[1]}</div>
                    <div className="text-sm text-gray-600">1 sao</div>
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="bg-white rounded-xl border p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Filter className="w-5 h-5" />
                    <span className="font-medium">Lọc theo đánh giá:</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["all", "5", "4", "3", "2", "1"].map((score) => (
                      <button
                        key={score}
                        onClick={() => setFilter(score)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium transition
                          ${filter === score
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                          }
                        `}
                      >
                        {score === "all" ? "Tất cả" : `${score} sao`}
                        {score !== "all" && (
                          <span className="ml-1 opacity-75">
                            ({stats.distribution[parseInt(score)] || 0})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feedbacks List */}
              {filteredFeedbacks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {filter === "all" ? "Bạn chưa có đánh giá nào" : "Không tìm thấy đánh giá phù hợp"}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {filter === "all" 
                      ? "Hãy đánh giá sản phẩm để giúp người khác có trải nghiệm mua sắm tốt hơn." 
                      : "Không có đánh giá nào với số sao bạn đang tìm."
                    }
                  </p>
                  {filter === "all" && (
                    <button
                      onClick={() => navigate('/my-orders')}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
                    >
                      Xem đơn hàng để đánh giá
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedbacks.map((feedback) => (
                    <div key={feedback.FeedbackId} className="bg-white rounded-xl border overflow-hidden">
                      {/* Header */}
                      <div className="p-6 border-b bg-gray-50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{feedback.CreatedAt}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Đơn hàng #{feedback.OrderId}
                            </div>
                          </div>
                          {editingId !== feedback.FeedbackId && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(feedback)}
                                className="px-3 py-1.5 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => deleteFeedback(feedback.FeedbackId)}
                                className="px-3 py-1.5 border border-red-300 cursor-pointer text-red-700 rounded-lg hover:bg-red-50 transition flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6">
                        {editingId === feedback.FeedbackId ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Đánh giá
                              </label>
                              {renderStars(editForm.score, true, (score) => 
                                setEditForm(prev => ({ ...prev, score }))
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nội dung
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <textarea
                                value={editForm.content || ""}
                                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                maxLength="500"
                              />
                              <div className="text-right text-sm text-gray-500 mt-1">
                                {editForm.content?.length || 0}/500 ký tự
                              </div>
                            </div>
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={cancelEdit}
                                disabled={submitting}
                                className="px-4 py-2 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => updateFeedback(feedback.FeedbackId)}
                                disabled={submitting}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <img
                                src={feedback.ProductImage || "https://via.placeholder.com/80"}
                                alt={feedback.ProductName}
                                className="w-20 h-20 rounded-lg object-cover border"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://via.placeholder.com/80";
                                }}
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-800 mb-1">
                                  {feedback.ProductName}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>Gian hàng: {feedback.StallName}</span>
                                  <span>•</span>
                                  <span>Đã mua: {feedback.Quantity || 1} sản phẩm</span>
                                </div>
                                <div className="mt-2">
                                  {renderStars(feedback.Score)}
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-gray-700">
                              {feedback.Content}
                            </div>

                            {/* Images */}
                            {feedback.Images && feedback.Images.length > 0 && (
                              <div className="flex gap-2">
                                {feedback.Images.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Review ${idx + 1}`}
                                      className="w-24 h-24 rounded-lg object-cover border cursor-pointer hover:opacity-90 transition"
                                      onClick={() => window.open(img, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-lg flex items-center justify-center">
                                      <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Updated timestamp */}
                            {feedback.UpdatedAt && feedback.UpdatedAt !== feedback.CreatedAt && (
                              <div className="text-sm text-gray-500 italic">
                                Đã chỉnh sửa vào {feedback.UpdatedAt}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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