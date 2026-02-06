import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import BuyerChat from "./BuyerChat";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import { Star, ShoppingBag, MessageCircle, Package, Award} from "lucide-react";

export default function ViewStall() {
  const { id } = useParams();
  const navigate = useNavigate();

  const account = JSON.parse(sessionStorage.getItem("account"));
  const currentAccountId = account?.AccountId;

  const [data, setData] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ avgScore: 0, totalFeedbacks: 0 });
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;
  const PRODUCT_IMAGE_BASE = `${API_URL}/uploads/ProductImage`;
  const FEEDBACK_IMAGE_BASE = `${API_URL}/uploads/FeedbackImage`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [stallRes, feedbackRes] = await Promise.all([
          axios.get(`/stalls/${id}`),
          axios.get(`/stalls/${id}/feedbacks`)
        ]);
        
        setData(stallRes.data);
        setFeedbacks(feedbackRes.data);
        
        // Tính điểm trung bình
        if (feedbackRes.data.length > 0) {
          const avg = feedbackRes.data.reduce((sum, fb) => sum + fb.Score, 0) / feedbackRes.data.length;
          setStats({
            avgScore: avg,
            totalFeedbacks: feedbackRes.data.length
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

  const renderStars = (score) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${
              i < Math.floor(score)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {score.toFixed(1)}
        </span>
      </div>
    );
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

              {/* Recent Feedbacks */}
              {feedbacks.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    Đánh giá gần đây
                  </h3>
                  
                  <div className="space-y-4">
                    {feedbacks.slice(0, 5).map((feedback) => (
                      <div key={feedback.FeedbackId} className="border-b pb-4 last:border-0">
                        <div className="flex items-start gap-3 mb-2">
                          <img
                            src={
                              feedback.CustomerAvt 
                                ? `${AVATAR_BASE}/${feedback.CustomerAvt}`
                                : `${AVATAR_BASE}/avtDf.png`
                            }
                            alt={feedback.CustomerName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-gray-800">
                                {feedback.CustomerName}
                              </span>
                              {renderStars(feedback.Score)}
                            </div>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {feedback.Content}
                            </p>
                            {feedback.Image && (
                              <img
                                src={`${FEEDBACK_IMAGE_BASE}/${feedback.Image}`}
                                alt="Feedback"
                                className="mt-2 h-20 rounded object-cover"
                              />
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(feedback.CreatedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {feedbacks.length > 5 && (
                      <button
                        onClick={() => document.getElementById('feedback-section').scrollIntoView({ behavior: 'smooth' })}
                        className="w-full text-center text-orange-500 font-medium py-2 hover:bg-orange-50 rounded-lg"
                      >
                        Xem thêm {feedbacks.length - 5} đánh giá
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Feedback Section */}
          {feedbacks.length > 0 && (
            <div id="feedback-section" className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Đánh giá về shop
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-center bg-orange-50 px-4 py-2 rounded-lg">
                    <p className="text-3xl font-bold text-orange-500">
                      {stats.avgScore.toFixed(1)}
                    </p>
                    <div className="flex justify-center mt-1">
                      {renderStars(stats.avgScore)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.FeedbackId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <img
                          src={
                            feedback.CustomerAvt 
                              ? `${AVATAR_BASE}/${feedback.CustomerAvt}`
                              : `${AVATAR_BASE}/avtDf.png`
                          }
                          alt={feedback.CustomerName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">{feedback.CustomerName}</p>
                              <p className="text-sm text-gray-500">
                                Đánh giá về: {feedback.ProductName}
                              </p>
                            </div>
                            <span className="text-sm text-gray-400">
                              {new Date(feedback.CreatedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            {renderStars(feedback.Score)}
                          </div>
                          
                          <p className="text-gray-700 mb-3">{feedback.Content}</p>
                          
                          {feedback.Image && (
                            <img
                              src={`${FEEDBACK_IMAGE_BASE}/${feedback.Image}`}
                              alt="Feedback"
                              className="h-40 rounded-lg object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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