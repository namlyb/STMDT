import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import BuyerChat from "./BuyerChat";
import ChatBubble from "../../components/ChatBox/ChatBubble";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const currentAccountId = account?.AccountId;

  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  const PRODUCT_IMAGE_BASE = `${API_URL}/uploads/ProductImage`;
  const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;

  /* ================= LOAD PRODUCT ================= */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/products/${id}`);
        setData(res.data);
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

    // Lưu thông tin mua ngay vào localStorage
    const buyNowData = {
      productId: data.product.ProductId,
      quantity: quantity,
      buyNow: true
    };
    
    localStorage.setItem("buyNowData", JSON.stringify(buyNowData));
    
    // Xóa cartIds cũ nếu có
    sessionStorage.removeItem("checkoutCartIds");
    
    // Chuyển hướng đến trang thanh toán
    navigate("/checkout");
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto p-4">
          <div className="bg-white p-8 rounded shadow text-center">
            <p className="text-gray-600">Đang tải sản phẩm...</p>
          </div>
        </main>
      </>
    );
  }

  if (!data || !data.product) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto p-4">
          <div className="bg-white p-8 rounded shadow text-center">
            <p className="text-gray-600">Sản phẩm không tồn tại</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          </div>
        </main>
      </>
    );
  }

  const { product, stall, feedbacks, avgScore } = data;

  const productImage = product.Image
    ? `${PRODUCT_IMAGE_BASE}/${product.Image}`
    : `${PRODUCT_IMAGE_BASE}/default.png`;

  const stallAvatar = stall?.Avt
    ? `${AVATAR_BASE}/${stall.Avt}`
    : `${AVATAR_BASE}/avtDf.png`;

  return (
    <>
      <Header />

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {/* PRODUCT */}
        <div className="bg-white p-4 rounded shadow grid grid-cols-2 gap-4">
          <div className="relative w-full h-72 overflow-hidden rounded bg-gray-100">
            <img
              src={productImage}
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
            />
            <img
              src={productImage}
              className="relative z-10 mx-auto h-full object-contain"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{product.ProductName}</h1>
            <p className="text-gray-600">{product.Description}</p>

            <p className="text-red-500 text-2xl font-bold">
              {Number(product.Price).toLocaleString()} ₫
            </p>

            <div className="flex items-center">
              <button onClick={decrease} className="px-3 border cursor-pointer">−</button>
              <input
                value={quantity}
                onChange={onChangeQuantity}
                className="w-12 text-center border"
              />
              <button onClick={increase} className="px-3 border cursor-pointer">+</button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={buyNow}
                className="px-6 py-2 bg-orange-500 text-white rounded cursor-pointer"
              >
                Mua ngay
              </button>

              <button onClick={addToCart} className="px-6 py-2 border rounded cursor-pointer">
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>

        {/* STALL */}
        <div className="bg-white p-4 rounded shadow flex justify-between">
          <div className="flex gap-4 items-center">
            <img src={stallAvatar} className="w-14 h-14 rounded-full" />
            <div>
              <p className="font-bold">{stall.StallName}</p>
              <p className="text-sm text-gray-500">⭐ {avgScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {canChat() && (
              <button
                onClick={() => setShowChat(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded cursor-pointer"
              >
                Chat
              </button>
            )}

            <button
              onClick={() => navigate(`/stall/${stall.StallId}`)}
              className="px-4 py-2 bg-orange-500 text-white rounded cursor-pointer"
            >
              Xem shop
            </button>
          </div>
        </div>
      </main>

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