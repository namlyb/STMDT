import { useState, useEffect } from "react";
import { useNavigate, useSearchParams  } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";

export default function CreateVoucher() {
    const navigate = useNavigate();
    const account = JSON.parse(sessionStorage.getItem("account"));
    const [params] = useSearchParams();
const voucherId = params.get("id");
    const [form, setForm] = useState({
        VoucherName: "",
        DiscountType: "percent",
        Discount: "",
        Quantity: "",
        ConditionText: "",
        EndTime: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const discount = Number(form.Discount);
        const quantity = Number(form.Quantity);
        const today = new Date().setHours(0, 0, 0, 0);
        const endDate = new Date(form.EndTime).setHours(0, 0, 0, 0);

        // ✅ Discount validation
        if (form.DiscountType === "percent") {
            if (discount < 5 || discount > 100) {
                alert("Giảm theo % chỉ được từ 5 đến 100");
                return;
            }
        }

        if (form.DiscountType === "fixed") {
            if (discount <= 0) {
                alert("Giảm cố định phải lớn hơn 0");
                return;
            }
        }

        // ✅ Quantity validation
        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 500) {
            alert("Số lượng phải là số nguyên từ 1 đến 500");
            return;
        }

        // ✅ EndTime validation
        if (endDate <= today) {
            alert("Ngày hết hạn không được trước ngày hiện tại");
            return;
        }

        setLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            await axios.post(
                "/vouchers",
                { ...form, CreatedBy: account.AccountId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Tạo voucher thành công!");
            navigate("/seller/voucher");
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tạo voucher");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
  if (!voucherId) return;

  const fetchVoucher = async () => {
    const res = await axios.get(`/vouchers/${voucherId}`);
    setForm({
      VoucherName: res.data.VoucherName,
      DiscountType: res.data.DiscountType,
      Discount: res.data.Discount,
      Quantity: "",
      ConditionText: res.data.ConditionText,
      EndTime: res.data.EndTime.split("T")[0],
    });
  };

  fetchVoucher();
}, [voucherId]);


    return (
        <>
            <Header />
            <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
                <SellerSidebar />

                <div className="flex-1 bg-white p-6 rounded-lg shadow">
                    <h1 className="text-2xl font-bold mb-6">Tạo phiếu giảm giá mới</h1>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* TÊN VOUCHER */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Tên voucher
                            </label>
                            <input
                                type="text"
                                name="VoucherName"
                                value={form.VoucherName}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                                placeholder="VD: SALE10"
                                required
                            />
                        </div>

                        {/* LOẠI GIẢM GIÁ */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Loại giảm giá
                            </label>
                            <select
                                name="DiscountType"
                                value={form.DiscountType}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                            >
                                <option value="percent">Phần trăm (%)</option>
                                <option value="fixed">Giảm tiền cố định</option>
                            </select>
                        </div>

                        {/* GIÁ TRỊ GIẢM */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Giá trị giảm
                            </label>
                            <input
                                type="number"
                                name="Discount"
                                value={form.Discount}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                                placeholder={form.DiscountType === "percent" ? "VD: 10 (%)" : "VD: 50000 (vnđ)"}
                                min={form.DiscountType === "percent" ? 5 : 1}
                                max={form.DiscountType === "percent" ? 100 : undefined}
                                required
                            />
                        </div>

                        {/* SỐ LƯỢNG */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Số lượng voucher
                            </label>
                            <input
                                type="number"
                                name="Quantity"
                                value={form.Quantity}
                                onChange={handleChange}
                                min={1}
                                max={500}
                                step={1}
                                className="border rounded px-3 py-2 w-full"
                                placeholder="VD: 20 (Phiếu)"
                                required
                            />
                        </div>

                        {/* ĐIỀU KIỆN */}

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Điều kiện áp dụng
                            </label>
                            <select
                                name="ConditionText"
                                value={form.ConditionText}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                                required
                            >
                                <option value="">-- Chọn điều kiện --</option>
                                <option value=">=0">Đơn từ 0đ</option>
                                <option value=">=10000">Đơn từ 10.000đ</option>
                                <option value=">=20000">Đơn từ 20.000đ</option>
                                <option value=">=50000">Đơn từ 50.000đ</option>
                                <option value=">=100000">Đơn từ 100.000đ</option>
                                <option value=">=200000">Đơn từ 200.000đ</option>
                                <option value=">=500000">Đơn từ 500.000đ</option>
                                <option value=">=1000000">Đơn từ 1.000.000đ</option>
                                <option value=">=2000000">Đơn từ 2.000.000đ</option>
                            </select>
                        </div>

                        {/* HẠN SỬ DỤNG */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Ngày hết hạn
                            </label>
                            <input
                                type="date"
                                name="EndTime"
                                value={form.EndTime}
                                onChange={handleChange}
                                min={new Date().toISOString().split("T")[0]}
                                className="border rounded px-3 py-2 w-full"
                                required
                            />

                        </div>

                        {/* BUTTONS */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition"
                            >
                                {loading ? "Đang tạo..." : "Tạo voucher"}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/seller/voucher")}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition"
                            >
                                Huỷ
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
