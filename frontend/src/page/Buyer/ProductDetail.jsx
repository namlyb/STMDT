import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const PRODUCT_IMAGE_BASE = `${API_URL}/uploads/ProductImage`;
    const AVATAR_BASE = `${API_URL}/uploads/AccountAvatar`;

    useEffect(() => {
        axios.get(`/products/${id}`)
            .then(res => setData(res.data))
            .catch(console.error);
    }, [id]);

    if (!data) return null;

    const { product, stall, feedbacks, avgScore } = data;

    const productImage = product.Image
        ? `${PRODUCT_IMAGE_BASE}/${product.Image}`
        : `${PRODUCT_IMAGE_BASE}/default.png`;

    const stallAvatar = stall?.Avt
        ? `${AVATAR_BASE}/${stall.Avt}`
        : `${AVATAR_BASE}/avtDf.png`;

    const increase = () => setQuantity(q => q + 1);

    const decrease = () => {
        if (quantity > 1) setQuantity(q => q - 1);
    };

    const onChangeQuantity = (e) => {
        let value = e.target.value;

        if (!/^\d*$/.test(value)) return;        // chặn số lẻ
        value = Number(value);

        if (value < 1) value = 1;
        setQuantity(value);
    };

    const addToCart = async () => {
        try {
            await axios.post(
                "/carts",
                { productId: product.ProductId, quantity },
                { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
            );
            alert("Đã thêm vào giỏ hàng");
        } catch (err) {
            if (err.response?.status === 401) {
                alert("Vui lòng đăng nhập");
            } else {
                alert("Không thể thêm vào giỏ hàng");
                console.error(err);
            }
        }
    };


    return (
        <>
            <Header />

            <main className="max-w-5xl mx-auto p-4 space-y-6">

                {/* ===== PHẦN 1: PRODUCT ===== */}
                <div className="bg-white p-4 rounded shadow grid grid-cols-2 gap-4">
                    <div className="relative w-full h-72 overflow-hidden rounded bg-gray-100">
                        {/* Background blur */}
                        <img
                            src={productImage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                        />

                        {/* Main image (KHÔNG upscale) */}
                        <img
                            src={productImage}
                            alt={product.ProductName}
                            className="relative z-10 mx-auto h-full object-contain"
                        />
                    </div>


                    <div className="space-y-3">

                        {/* Tên */}
                        <h1 className="text-2xl font-bold">
                            {product.ProductName}
                        </h1>

                        {/* Description */}
                        <p className="text-gray-600">
                            {product.Description}
                        </p>

                        {/* Đơn hàng + đánh giá */}
                        <div className="flex gap-4 text-sm text-gray-500">
                            <span>🛒 {data.totalOrders} đơn hàng</span>
                            <span>⭐ {avgScore.toFixed(1)} ({feedbacks.length} đánh giá)</span>
                        </div>

                        {/* Giá */}
                        <p className="text-red-500 text-2xl font-bold">
                            {Number(product.Price).toLocaleString()} ₫
                        </p>

                        {/* Chọn số lượng */}
                        <div className="flex items-center">
                            {/* Minus */}
                            <button
                                onClick={decrease}
                                className="
            h-8 w-8
            flex items-center justify-center
            border border-gray-300
            rounded-l-md
            bg-gray-100
            hover:bg-gray-200
            transition-all duration-150
            text-sm
            select-none
            cursor-pointer
        "
                            >
                                −
                            </button>

                            {/* Input */}
                            <input
                                type="text"
                                value={quantity}
                                onChange={onChangeQuantity}
                                className="
            h-8 w-12
            text-center
            text-sm
            border-t border-b border-gray-300
            outline-none
            focus:ring-1 focus:ring-orange-400
        "
                            />

                            {/* Plus */}
                            <button
                                onClick={increase}
                                className="
            h-8 w-8
            flex items-center justify-center
            border border-gray-300
            rounded-r-md
            bg-gray-100
            hover:bg-gray-200
            transition-all duration-150
            text-sm
            select-none
            cursor-pointer
        "
                            >
                                +
                            </button>
                        </div>



                        {/* Button */}
                        <div className="flex gap-3 mt-4">
                            <button className="px-6 py-2 bg-orange-500 text-white rounded cursor-pointer">
                                Mua ngay
                            </button>

                            <button
                                onClick={addToCart}
                                className="px-6 py-2 border rounded cursor-pointer"
                            >
                                Thêm vào giỏ
                            </button>
                        </div>

                    </div>

                </div>

                {/* ===== PHẦN 2: STALL ===== */}
                <div className="bg-white p-4 rounded shadow flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src={stallAvatar}
                            alt={stall.StallName}
                            className="w-14 h-14 rounded-full object-cover image-sharp"
                        />

                        <div>
                            <p className="font-bold">{stall.StallName}</p>
                            <p className="text-sm text-gray-500">
                                ⭐ {avgScore.toFixed(1)} / 5
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="px-4 py-2 border rounded cursor-pointer">
                            Chat
                        </button>

                        <button
                            onClick={() => navigate(`/stall/${stall.StallId}`)}
                            className="px-4 py-2 bg-orange-500 text-white rounded cursor-pointer"
                        >
                            Xem shop
                        </button>
                    </div>
                </div>

                {/* ===== PHẦN 3: FEEDBACK ===== */}
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="font-bold mb-4">
                        Đánh giá sản phẩm ({feedbacks.length})
                    </h2>

                    <div className="space-y-4">
                        {feedbacks.map(fb => {
                            const fbAvatar = fb.Avt
                                ? `${AVATAR_BASE}/${fb.Avt}`
                                : `${AVATAR_BASE}/avtDf.png`;

                            return (
                                <div key={fb.FeedbackId} className="border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={fbAvatar}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                        <p className="font-semibold">{fb.Name}</p>
                                        <p className="text-sm text-yellow-500">
                                            ⭐ {fb.Score}
                                        </p>
                                    </div>

                                    <p className="mt-2 text-gray-700">
                                        {fb.Content}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </>
    );
}
