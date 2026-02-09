import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/Footer";
import Sidebar from "../../components/Buyer/Sidebar";
import { 
  Star, Upload, X, Check, Package, ChevronLeft, 
  MessageSquare, Image as ImageIcon, AlertCircle
} from "lucide-react";

export default function CreateFeedback() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Form state
  const [score, setScore] = useState(5);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchOrderProducts();
  }, [orderId]);

  const fetchOrderProducts = async () => {
  try {
    const token = sessionStorage.getItem("token");
    setLoading(true);
    
    console.log("Token:", token);
    console.log("Order ID:", orderId);
    
    // THỬ TRỰC TIẾP với URL đầy đủ
    const fullUrl = `http://localhost:8080/feedback/order/${orderId}/products`;
    console.log("Full URL:", fullUrl);
    
    const response = await fetch(fullUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Response data:", data);
    
    setProducts(data.products);
    
  } catch (error) {
    console.error("Fetch order products error:", error);
    
    // Test không có token để xem có phải do auth không
    try {
      const testResponse = await fetch(`http://localhost:8080/feedback/order/${orderId}/products`);
      const testData = await testResponse.json();
      console.log("Test without token:", testData);
    } catch (noTokenError) {
      console.log("Test without token failed:", noTokenError);
    }
    
    if (error.message.includes('401')) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("account");
      navigate("/login");
    } else {
      alert(`Lỗi: ${error.message}\n\nVui lòng kiểm tra console để biết chi tiết.`);
    }
  } finally {
    setLoading(false);
  }
};

  const handleStartFeedback = (product) => {
    if (product.hasFeedback) {
      alert("Bạn đã đánh giá sản phẩm này rồi!");
      return;
    }
    
    setSelectedProduct(product);
    setScore(5);
    setContent("");
    setImage(null);
    setImagePreview(null);
    setError("");
    setShowFeedbackModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Kiểm tra kích thước file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh tối đa là 5MB");
        return;
      }
      
      // Kiểm tra định dạng
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)");
        return;
      }
      
      setImage(file);
      setError("");
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitFeedback = async () => {
    // Validation
    if (!selectedProduct) return;
    
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung đánh giá");
      return;
    }
    
    if (content.trim().length < 10) {
      setError("Nội dung đánh giá phải có ít nhất 10 ký tự");
      return;
    }
    
    if (content.trim().length > 500) {
      setError("Nội dung đánh giá không được vượt quá 500 ký tự");
      return;
    }
    
    setError("");
    setSubmitting(true);
    
    try {
      const token = sessionStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("OrderDetailId", selectedProduct.OrderDetailId);
      formData.append("Score", score);
      formData.append("Content", content.trim());
      if (image) {
        formData.append("Image", image);
      }
      
      const response = await axios.post("/feedback", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      alert("Đánh giá thành công!");
      
      // Cập nhật UI: đánh dấu sản phẩm đã được feedback
      setProducts(prev => prev.map(product => 
        product.OrderDetailId === selectedProduct.OrderDetailId
          ? { ...product, hasFeedback: true, canFeedback: false }
          : product
      ));
      
      // Đóng modal và reset form
      setShowFeedbackModal(false);
      setSelectedProduct(null);
      setScore(5);
      setContent("");
      setImage(null);
      setImagePreview(null);
      
    } catch (error) {
      console.error("Submit feedback error:", error);
      const errorMsg = error.response?.data?.message || "Đánh giá thất bại. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const renderStars = (count) => {
    return Array(5).fill(0).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
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
                <button
                  onClick={() => navigate("/orders")}
                  className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-4 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Quay lại đơn hàng
                </button>
                
                <h1 className="text-3xl font-bold text-gray-800">Đánh giá sản phẩm</h1>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <Package className="w-4 h-4" />
                    <span>Đơn hàng #{orderId}</span>
                  </div>
                  <div className="text-gray-600">
                    {products.filter(p => p.canFeedback).length} sản phẩm chưa đánh giá
                  </div>
                </div>
              </div>

              {/* Product List */}
              <div className="bg-white rounded-xl border overflow-hidden">
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có sản phẩm nào</h3>
                    <p className="text-gray-500">Đơn hàng này không có sản phẩm nào để đánh giá.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {products.map((product) => (
                      <div key={product.OrderDetailId} className="p-6 hover:bg-gray-50">
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <img
                              src={product.ProductImage || "https://via.placeholder.com/100"}
                              alt={product.ProductName}
                              className="w-20 h-20 rounded-lg object-cover border"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/100";
                              }}
                            />
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h3 className="font-medium text-gray-800">{product.ProductName}</h3>
                                <p className="text-sm text-gray-600 mt-1">{product.StallName}</p>
                                
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span>Số lượng: {product.Quantity}</span>
                                  <span>•</span>
                                  <span>Giá: {formatPrice(product.UnitPrice)}</span>
                                </div>
                              </div>
                              
                              {/* Status & Actions */}
                              <div className="flex flex-col items-end gap-3">
                                {product.hasFeedback ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <Check className="w-5 h-5" />
                                    <span className="text-sm font-medium">Đã đánh giá</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-sm text-gray-500">Chưa đánh giá</span>
                                    <button
                                      onClick={() => handleStartFeedback(product)}
                                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer flex items-center gap-2"
                                    >
                                      <Star className="w-4 h-4" />
                                      Đánh giá ngay
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Tổng sản phẩm</div>
                  <div className="text-2xl font-bold text-gray-800">{products.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Đã đánh giá</div>
                  <div className="text-2xl font-bold text-green-600">
                    {products.filter(p => p.hasFeedback).length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Chưa đánh giá</div>
                  <div className="text-2xl font-bold text-orange-500">
                    {products.filter(p => p.canFeedback).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => !submitting && setShowFeedbackModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Đánh giá sản phẩm</h2>
                <p className="text-gray-600 text-sm mt-1">{selectedProduct.ProductName}</p>
              </div>
              <button
                onClick={() => !submitting && setShowFeedbackModal(false)}
                disabled={submitting}
                className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Product Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={selectedProduct.ProductImage || "https://via.placeholder.com/60"}
                  alt={selectedProduct.ProductName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-medium text-gray-800">{selectedProduct.ProductName}</h3>
                  <p className="text-sm text-gray-600">{selectedProduct.StallName}</p>
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Chất lượng sản phẩm
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setScore(star)}
                      disabled={submitting}
                      className="cursor-pointer p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= score
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-4 text-lg font-bold text-gray-700">
                    {score} sao
                  </span>
                </div>
                <div className="flex gap-2 mt-2 text-sm text-gray-500">
                  <span>Rất tệ</span>
                  <span className="flex-1"></span>
                  <span>Tuyệt vời</span>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nội dung đánh giá
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={submitting}
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm này (sản phẩm có tốt không, có đúng với mô tả không, có nên mua không...)"
                    maxLength={500}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                    {content.length}/500
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>Viết đánh giá chi tiết sẽ được cộng thêm điểm tích lũy!</span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Hình ảnh đính kèm (tùy chọn)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-48 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          disabled={submitting}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">Nhấp để thay đổi ảnh</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-3">Kéo thả ảnh vào đây hoặc</p>
                      <label className="cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={submitting}
                        />
                        <div className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition inline-flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Chọn ảnh từ máy tính
                        </div>
                      </label>
                      <p className="text-sm text-gray-500 mt-3">JPEG, PNG, GIF (tối đa 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={() => !submitting && setShowFeedbackModal(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || content.trim().length < 1}
                  className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                    submitting || content.trim().length < 1
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-orange-500 cursor-pointer hover:bg-orange-600"
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      Gửi đánh giá
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}