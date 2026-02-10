import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import BuyerChat from "./BuyerChat";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import { Star, ShoppingBag, MessageCircle, Package, Award, Users, StarHalf } from "lucide-react";

export default function ViewStall() {
  const { id } = useParams();
  const navigate = useNavigate();

  const account = JSON.parse(sessionStorage.getItem("account"));
  const currentAccountId = account?.AccountId;

  const [data, setData] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ 
    avgScore: 0, 
    totalFeedbacks: 0,
    scoreDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;
  const PRODUCT_IMAGE_BASE = `${API_URL}/uploads/ProductImage`;
  const FEEDBACK_IMAGE_BASE = `${API_URL}/uploads/feedback`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [stallRes, feedbackRes] = await Promise.all([
          axios.get(`/stalls/${id}`),
          axios.get(`/feedback/stall/${id}/public?page=1&limit=10`)
        ]);
        
        setData(stallRes.data);
        
        if (feedbackRes.data.success) {
          setFeedbacks(feedbackRes.data.feedbacks);
          setStats({
            avgScore: parseFloat(feedbackRes.data.rating.average) || 0,
            totalFeedbacks: feedbackRes.data.rating.total || 0,
            scoreDistribution: feedbackRes.data.stats?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          });
        }
      } catch (err) {
        console.error("Load stall error:", err);
        alert("Không tìm thấy gian hàng");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const loadMoreFeedbacks = async () => {
    if (feedbackLoading) return;
    
    try {
      setFeedbackLoading(true);
      const nextPage = feedbackPage + 1;
      const response = await axios.get(`/feedback/stall/${id}/public?page=${nextPage}&limit=10`);
      
      if (response.data.success) {
        setFeedbacks(prev => [...prev, ...response.data.feedbacks]);
        setFeedbackPage(nextPage);
      }
    } catch (error) {
      console.error("Load more feedbacks error:", error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 space-y-3">
                      <div className="h-48 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!data) return null;

  const { stall, products } = data;

  const canChat =
    currentAccountId &&
    currentAccountId !== stall.AccountId;

  const stallAvatar = stall.Avt 
    ? `${AVATAR_BASE}/${stall.Avt}`
    : `${AVATAR_BASE}/avtDf.png`;

  const renderStars = (score, size = "md") => {
    const sizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6"
    };
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sizes[size]} ${
              i < Math.floor(score)
                ? "text-yellow-400 fill-yellow-400"
                : i < score
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className={`ml-2 ${size === 'lg' ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  const getStarPercentage = (star) => {
    const total = stats.totalFeedbacks;
    if (total === 0) return 0;
    return Math.round((stats.scoreDistribution[star] / total) * 100);
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stall Header */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={stallAvatar}
                    alt={stall.StallName}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {stall.StallName}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                      <ShoppingBag size={16} className="text-gray-600" />
                      <span className="text-sm font-medium">
                        {products.length} sản phẩm
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                      <Award size={16} className="text-amber-500" />
                      <span className="text-sm font-medium">
                        {stats.totalFeedbacks} đánh giá
                      </span>
                    </div>
                    
                    {stats.totalFeedbacks > 0 && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                        {renderStars(stats.avgScore)}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600">
                    <span className="font-medium">Chủ shop:</span> {stall.Name}
                  </p>
                </div>
              </div>

              {canChat && (
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 cursor-pointer text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-shadow duration-200"
                >
                  <MessageCircle size={20} />
                  Chat với shop
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Products Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Sản phẩm của shop
                </h2>
                <span className="text-gray-500">
                  {products.length} sản phẩm
                </span>
              </div>

              {products.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Shop chưa có sản phẩm nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.ProductId}
                      onClick={() => navigate(`/product/${product.ProductId}`)}
                      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    >
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img
                          src={`${PRODUCT_IMAGE_BASE}/${product.Image}`}
                          alt={product.ProductName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.Status === 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold px-3 py-1 bg-red-500 rounded-full text-sm">
                              Ngừng bán
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-orange-500">
                          {product.ProductName}
                        </h3>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-red-500 font-bold text-lg">
                            {Number(product.Price).toLocaleString()} ₫
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats & Feedback Sidebar */}
            <div className="space-y-6">
              {/* Shop Stats */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Thống kê shop
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Sản phẩm:</span>
                    <span className="font-semibold">{products.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Đánh giá:</span>
                    <span className="font-semibold">{stats.totalFeedbacks}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Điểm đánh giá:</span>
                    {stats.totalFeedbacks > 0 ? (
                      renderStars(stats.avgScore)
                    ) : (
                      <span className="text-gray-400 text-sm">Chưa có</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Star Distribution */}
              {stats.totalFeedbacks > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <StarHalf className="w-5 h-5 text-yellow-500" />
                    Phân phối điểm
                  </h3>
                  
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center w-16">
                          <span className="text-sm text-gray-600 w-4">{star}</span>
                          <Star className="w-4 h-4 text-yellow-400 ml-1" />
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-yellow-400 h-full rounded-full"
                            style={{ width: `${getStarPercentage(star)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-10">
                          {getStarPercentage(star)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Đánh giá về shop
                </h2>
                <p className="text-gray-600 mt-1">
                  {stats.totalFeedbacks} đánh giá từ khách hàng
                </p>
              </div>
              
              {stats.totalFeedbacks > 0 && (
                <div className="text-center bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-orange-600">
                      {stats.avgScore.toFixed(1)}
                    </span>
                    <div>
                      {renderStars(stats.avgScore, "lg")}
                      <p className="text-sm text-gray-600 mt-1">
                        trên 5 sao
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {stats.totalFeedbacks === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Chưa có đánh giá nào
                </h3>
                <p className="text-gray-500">
                  Hãy là người đầu tiên đánh giá shop này
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.FeedbackId} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <img
  src={
    feedback.AccountAvatar 
      ? (feedback.AccountAvatar.startsWith('http')
          ? feedback.AccountAvatar
          : `${AVATAR_BASE}/${feedback.AccountAvatar}`)
      : `${AVATAR_BASE}/avtDf.png`
  }
  alt={feedback.AccountName}
  className="w-12 h-12 rounded-full flex-shrink-0"
/>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {feedback.AccountName}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Đánh giá về: {feedback.ProductName || "sản phẩm"}
                              </p>
                            </div>
                            <div className="text-right">
                              {renderStars(feedback.Score)}
                              <span className="text-xs text-gray-400 block mt-1">
                                {new Date(feedback.CreatedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mt-3">
                            {feedback.Content}
                          </p>
                          
                          {/* Hiển thị nhiều ảnh */}
{feedback.Images && feedback.Images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {feedback.Images.map((image, imgIndex) => {
                            // Xử lý URL ảnh feedback
                            const imageUrl = typeof image === 'string' 
                              ? (image.startsWith('http') 
                                  ? image 
                                  : `${FEEDBACK_IMAGE_BASE}/${image}`)
                              : '';
                            
                            return (
                              <img
                                key={imgIndex}
                                src={imageUrl}
                                alt={`Hình ${imgIndex + 1}`}
                                className="h-24 w-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() => {
                                  const modalImage = document.getElementById('modal-image');
                                  const modal = document.getElementById('image-modal');
                                  if (modalImage && modal) {
                                    modalImage.src = imageUrl;
                                    modal.classList.remove('hidden');
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {feedbacks.length < stats.totalFeedbacks && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMoreFeedbacks}
                      disabled={feedbackLoading}
                      className="px-6 py-2.5 bg-white border border-gray-300 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-50 transition inline-flex items-center gap-2"
                    >
                      {feedbackLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-orange-500"></div>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          Xem thêm đánh giá
                          <ChevronLeft className="w-4 h-4 rotate-90" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal */}
      <div id="image-modal" className="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => document.getElementById('image-modal').classList.add('hidden')}
            className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 cursor-pointer"
          >
          </button>
          <img
            id="modal-image"
            src=""
            alt="Ảnh đánh giá"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>
      </div>

      {/* Chat Components */}
      {canChat && (
        <>
          <ChatBubble
            sellerId={stall.AccountId}
            visible={!showChat}
            onOpen={() => setShowChat(true)}
          />

          {showChat && (
            <BuyerChat
              sellerId={stall.AccountId}
              onClose={() => setShowChat(false)}
            />
          )}
        </>
      )}
    </>
  );
}