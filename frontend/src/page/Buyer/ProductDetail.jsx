import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import BuyerChat from "./BuyerChat";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import { Star, ShoppingBag, MessageCircle, Package, Award, Users } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const currentAccountId = account?.AccountId;
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [rating, setRating] = useState({ average: "0.0", totalReviews: 0 });

  const PRODUCT_IMAGE_BASE = `${API_URL}/uploads/ProductImage`;
  const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;
  const FEEDBACK_IMAGE_BASE = `${API_URL}/uploads/feedback`;

  /* ================= LOAD PRODUCT ================= */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/products/${id}`);
        console.log("Product API Response:", res.data); // Debug log
        
        if (res.data.success) {
          setData({
            product: res.data.product,
            stall: res.data.stall
          });
          setFeedbacks(res.data.feedbacks || []);
          setRating({
            average: res.data.rating?.average || "0.0",
            totalReviews: res.data.rating?.totalReviews || 0
          });
        } else {
          setData(res.data);
        }
      } catch (error) {
        console.error("Error loading product:", error);
        alert("Không thể tải thông tin sản phẩm");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  /* ================= QUANTITY ================= */
  const increase = () => setQuantity(q => q + 1);
  const decrease = () => quantity > 1 && setQuantity(q => q - 1);

  const onChangeQuantity = (e) => {
    let value = e.target.value;
    if (!/^\d*$/.test(value)) return;
    setQuantity(Math.max(1, Number(value)));
  };

  /* ================= CHAT PERMISSION ================= */
  const canChat = () => {
    if (!currentAccountId) return false;
    if (!data?.stall?.AccountId) return false;
    return currentAccountId !== data.stall.AccountId;
  };

  /* ================= CART ================= */
  const addToCart = async () => {
    try {
      if (!account) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        navigate("/login");
        return;
      }

      await axios.post(
        "/carts",
        { productId: data.product.ProductId, quantity },
        { 
          headers: { 
            Authorization: `Bearer ${sessionStorage.getItem("token")}` 
          } 
        }
      );
      alert("Đã thêm vào giỏ hàng");
    } catch (error) {
      console.error("Add to cart error:", error);
      if (error.response?.status === 401) {
        alert("Vui lòng đăng nhập");
        navigate("/login");
      } else {
        alert(error.response?.data?.message || "Không thể thêm vào giỏ hàng");
      }
    }
  };

  /* ================= BUY NOW ================= */
  const buyNow = () => {
    if (!account) {
      alert("Vui lòng đăng nhập để mua hàng");
      navigate("/login");
      return;
    }

    const buyNowData = {
      productId: data.product.ProductId,
      quantity: quantity,
      buyNow: true
    };
    
    localStorage.setItem("buyNowData", JSON.stringify(buyNowData));
    sessionStorage.removeItem("checkoutCartIds");
    navigate("/checkout");
  };

  /* ================= RENDER STARS ================= */
  const renderStars = (score, size = "md") => {
    const sizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6"
    };
    
    const numericScore = parseFloat(score) || 0;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sizes[size]} ${
              i < Math.floor(numericScore)
                ? "text-yellow-400 fill-yellow-400"
                : i < numericScore
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className={`ml-2 ${size === 'lg' ? 'text-lg' : 'text-sm'} text-gray-600 font-medium`}>
          {numericScore.toFixed(1)}
        </span>
      </div>
    );
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto p-4 pt-20">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-12 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!data || !data.product) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto p-4 pt-20">
          <div className="bg-white p-8 rounded-xl shadow text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">Sản phẩm không tồn tại</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          </div>
        </main>
      </>
    );
  }

  const { product, stall } = data;

  // Kiểm tra và sửa URL ảnh sản phẩm
  const productImage = product.Image 
    ? (product.Image.startsWith('http') 
        ? product.Image 
        : `${PRODUCT_IMAGE_BASE}/${product.Image}`)
    : `${PRODUCT_IMAGE_BASE}/default.png`;

  const stallAvatar = stall?.Avt
    ? `${AVATAR_BASE}/${stall.Avt}`
    : `${AVATAR_BASE}/avtDf.png`;

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 pt-20">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6">
          <span className="cursor-pointer hover:text-orange-500" onClick={() => navigate("/")}>Trang chủ</span>
          <span className="mx-2">/</span>
          <span className="cursor-pointer hover:text-orange-500" onClick={() => navigate("/search")}>Sản phẩm</span>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-medium">{product.ProductName}</span>
        </div>

        {/* PRODUCT DETAILS */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative">
              <div className="relative w-full h-96 overflow-hidden rounded-xl bg-gray-50">
                <img
                  src={productImage}
                  alt={product.ProductName}
                  className="w-full h-full object-contain"
                />
                {product.Status === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <span className="text-white font-semibold px-4 py-2 bg-red-500 rounded-full">
                      Ngừng bán
                    </span>
                  </div>
                )}
              </div>
              
              {/* Image Gallery (nếu có nhiều ảnh) */}
              <div className="flex gap-3 mt-4 overflow-x-auto">
                <div className="w-20 h-20 flex-shrink-0 rounded-lg border-2 border-orange-500 overflow-hidden">
                  <img src={productImage} alt={product.ProductName} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-3">
                  {product.ProductName}
                </h1>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center">
                    {renderStars(rating.average)}
                    <span className="ml-2 text-gray-500">
                      ({rating.totalReviews} đánh giá)
                    </span>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <span className="text-green-600 font-medium">
                    Đã bán: {product.soldCount || 0}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl font-bold text-red-500">
                    {Number(product.Price).toLocaleString()} ₫
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Mô tả sản phẩm</h3>
                <p className="text-gray-600 whitespace-pre-line">
                  {product.Description}
                </p>
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Số lượng</h3>
                  <div className="flex items-center w-32">
                    <button 
                      onClick={decrease}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-lg hover:bg-gray-50 cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={onChangeQuantity}
                      className="w-12 h-10 text-center border-t border-b border-gray-300"
                    />
                    <button 
                      onClick={increase}
                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-r-lg hover:bg-gray-50 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={buyNow}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    Mua ngay
                  </button>

                  <button 
                    onClick={addToCart}
                    className="flex-1 px-6 py-3 border-2 border-orange-500 text-orange-500 font-semibold rounded-lg hover:bg-orange-50 transition cursor-pointer"
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STALL INFO */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={stallAvatar} 
                alt={stall?.StallName} 
                className="w-16 h-16 rounded-full border-2 border-orange-100"
              />
              <div>
                <h3 className="font-bold text-gray-800">{stall?.StallName}</h3>
                <p className="text-gray-600 text-sm">Chủ shop: {stall?.Name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(rating.average, "sm")}
                  <span className="text-sm text-gray-500">
                    ({rating.totalReviews} đánh giá)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {canChat() && (
                <button
                  onClick={() => setShowChat(true)}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle size={18} />
                  Chat với shop
                </button>
              )}

              <button
                onClick={() => navigate(`/stall/${stall?.StallId}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                Xem shop
              </button>
            </div>
          </div>
        </div>

        {/* FEEDBACK SECTION */}
        {feedbacks.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Đánh giá sản phẩm</h2>
            
            {/* Rating Summary */}
            <div className="flex items-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-800 mb-1">
                  {rating.average}
                  <span className="text-3xl text-gray-500">/5</span>
                </div>
                {renderStars(rating.average, "lg")}
                <p className="text-gray-500 mt-2">{rating.totalReviews} đánh giá</p>
              </div>
            </div>

            {/* Feedback List */}
            <div className="space-y-6">
              {feedbacks.map((feedback) => (
                <div key={feedback.FeedbackId} className="border-b pb-6 last:border-0">
                  <div className="flex items-start gap-4">
                    <img
                      src={feedback.AccountAvatar || `${AVATAR_BASE}/avtDf.png`}
                      alt={feedback.AccountName}
                      className="w-12 h-12 rounded-full"
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {feedback.AccountName}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {new Date(feedback.CreatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {renderStars(feedback.Score)}
                      </div>
                      
                      <p className="text-gray-700 mt-3 mb-4">
                        {feedback.Content}
                      </p>
                      
                      {/* Feedback Images */}
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
          </div>
        )}
      </main>

      {/* Image Modal */}
      <div id="image-modal" className="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => document.getElementById('image-modal').classList.add('hidden')}
            className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 cursor-pointer"
          >
            ✕
          </button>
          <img
            id="modal-image"
            src=""
            alt="Ảnh đánh giá"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>
      </div>

      {/* CHAT BUBBLE + POPUP */}
      {canChat() && (
        <>
          <ChatBubble
            sellerId={stall?.AccountId}
            visible={!showChat}
            onOpen={() => setShowChat(true)}
          />

          {showChat && (
            <BuyerChat
              sellerId={stall?.AccountId}
              onClose={() => setShowChat(false)}
            />
          )}
        </>
      )}
    </>
  );
}