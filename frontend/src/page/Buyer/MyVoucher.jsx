import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Sidebar from "../../components/Buyer/Sidebar";
import axios from "../../components/lib/axios";

export default function MyVoucher() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyVouchers = async () => {
            try {
                const res = await axios.get("/voucher-usage/me");
                setVouchers(res.data);
            } catch (err) {
                console.error("Lỗi lấy voucher:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyVouchers();
    }, []);

    return (
        <>
            <Header />

            <div className="max-w-[1200px] mx-auto mt-6 flex gap-6">
                <Sidebar />

                <div className="flex-1 bg-white rounded-lg p-6 border">
                    <h1 className="text-xl font-semibold mb-4">Voucher của tôi</h1>

                    {loading ? (
                        <p>Đang tải voucher...</p>
                    ) : vouchers.length === 0 ? (
                        <p className="text-gray-500">Bạn chưa có voucher nào</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vouchers.map((v) => (
                                <div key={v.UsageId}>
                                    {/* VOUCHER */}
                                    <div className="flex bg-white rounded-lg shadow-sm overflow-hidden h-[130px]">

                                        {/* LEFT */}
                                        <div className="w-24 bg-orange-400 text-white flex flex-col items-center justify-center px-2">
                                            <div className="text-[10px] font-semibold tracking-wide">
                                                VOUCHER
                                            </div>
                                            <div className="mt-1 font-bold text-sm text-center leading-tight line-clamp-2">
                                                {v.VoucherName}
                                            </div>
                                        </div>

                                        {/* RĂNG CƯA */}
                                        <div className="relative">
                                            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around">
                                                {[...Array(6)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-3 h-3 bg-gray-100 rounded-full -translate-x-1/2"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* RIGHT */}
                                        <div className="flex-1 p-3 pl-6 flex flex-col justify-between">
                                            <div>
                                                {/* GIẢM GIÁ */}
                                                <h2 className="font-semibold text-gray-900 text-sm">
                                                    {v.DiscountType === "percent"
                                                        ? `Giảm ${v.DiscountValue}%`
                                                        : `Giảm ${Number(v.DiscountValue).toLocaleString("vi-VN")}đ`}
                                                </h2>

                                                {/* MAX DISCOUNT (NẾU CÓ) */}
                                                {v.DiscountType === "percent" && v.MaxDiscount !== null && (
                                                    <p className="text-xs text-gray-600">
                                                        Giảm tối đa {Number(v.MaxDiscount).toLocaleString("vi-VN")}đ
                                                    </p>
                                                )}

                                                {/* ĐIỀU KIỆN ĐƠN HÀNG */}
                                                <p className="text-xs text-gray-600">
                                                    Cho đơn từ{" "}
                                                    {Number(v.MinOrderValue ?? 0).toLocaleString("vi-VN")}đ
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    {/* HẠN SỬ DỤNG */}
                                                    <p className="text-[11px] text-gray-500">
                                                        HSD: {new Date(v.EndTime).toLocaleDateString("vi-VN")}
                                                    </p>

                                                    {/* SỐ LƯỢNG */}
                                                    <p className="text-[11px] text-gray-500">
                                                        Số lượng: {v.Quantity}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => navigate("/cart")}
                                                    className="border border-red-500 text-red-500 cursor-pointer text-xs px-3 py-1 rounded hover:bg-red-50"
                                                >
                                                    Dùng ngay
                                                </button>
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
