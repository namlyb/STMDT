import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
        DiscountValue: "",
        MinOrderValue: "",
        MaxDiscount: "",
        Quantity: "",
        EndTime: "",
    });


    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const roleId = sessionStorage.getItem("roleId");

        if (roleId !== "3") {
            alert("Bạn không có quyền truy cập");
            navigate("/");
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "DiscountType" && value !== "percent") {
            setForm({ ...form, DiscountType: value, MaxDiscount: "" });
            return;
        }

        setForm({ ...form, [name]: value });
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
                {
                    ...form,
                    DiscountValue: Number(form.DiscountValue),
                    MinOrderValue: Number(form.MinOrderValue),
                    MaxDiscount: form.DiscountType === "percent"
                        ? Number(form.MaxDiscount)
                        : null,
                    Quantity: Number(form.Quantity),
                    EndTime: form.EndTime,
                    CreatedBy: account.AccountId,
                },
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

                <div className="flex-1 bg-white p-6 rounded-lg border border-black-300 shadow">
                    <h1 className="text-2xl font-bold mb-6">Tạo phiếu giảm giá mới</h1>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* TÊN */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên voucher</label>
                            <input
                                name="VoucherName"
                                value={form.VoucherName}
                                onChange={handleChange}
                                required
                                className="border rounded px-3 py-2 w-full"
                            />
                        </div>

                        {/* LOẠI */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Loại giảm</label>
                            <select
                                name="DiscountType"
                                value={form.DiscountType}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                            >
                                <option value="percent">Theo %</option>
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
                                name="DiscountValue"
                                value={form.DiscountValue}
                                onChange={handleChange}
                                min={form.DiscountType === "percent" ? 1 : 1000}
                                max={form.DiscountType === "percent" ? 100 : undefined}
                                required
                                className="border rounded px-3 py-2 w-full"
                                placeholder={
                                    form.DiscountType === "percent"
                                        ? "VD: 10 (%)"
                                        : "VD: 50000 (vnđ)"
                                }
                            />
                        </div>

                        {/* 🔥 MAX DISCOUNT – CHỈ HIỆN KHI percent */}
                        {form.DiscountType === "percent" && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Giảm tối đa (vnđ)
                                </label>
                                <select
                                    name="MaxDiscount"
                                    value={form.MaxDiscount}
                                    onChange={handleChange}
                                    required
                                    className="border rounded px-3 py-2 w-full cursor-pointer"
                                >
                                    <option value="">-- Chọn mức tối đa --</option>
                                    <option value="10000">10.000đ</option>
                                    <option value="20000">20.000đ</option>
                                    <option value="50000">50.000đ</option>
                                    <option value="100000">100.000đ</option>
                                    <option value="200000">200.000đ</option>
                                    <option value="500000">500.000đ</option>
                                    <option value="1000000">1.000.000đ</option>
                                </select>
                            </div>
                        )}

                        {/* ĐƠN TỐI THIỂU */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Giá trị đơn tối thiểu
                            </label>
                            <select
                                name="MinOrderValue"
                                value={form.MinOrderValue}
                                onChange={handleChange}
                                required
                                className="border rounded px-3 py-2 w-full"
                            >
                                <option value="">-- Chọn --</option>
                                <option value="0">Từ 0đ</option>
                                <option value="10000">Từ 10.000đ</option>
                                <option value="20000">Từ 20.000đ</option>
                                <option value="50000">Từ 50.000đ</option>
                                <option value="100000">Từ 100.000đ</option>
                                <option value="200000">Từ 200.000đ</option>
                                <option value="500000">Từ 500.000đ</option>
                                <option value="1000000">Từ 1.000.000đ</option>
                                <option value="2000000">Từ 2.000.000đ</option>
                            </select>
                        </div>

                        {/* SỐ LƯỢNG */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Số lượng</label>
                            <input
                                type="number"
                                name="Quantity"
                                value={form.Quantity}
                                onChange={handleChange}
                                min={1}
                                max={500}
                                required
                                className="border rounded px-3 py-2 w-full"
                            />
                        </div>

                        {/* HẠN */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Ngày hết hạn
                            </label>
                            <input
                                type="date"
                                name="EndTime"
                                value={form.EndTime}
                                onChange={handleChange}
                                required
                                min={new Date().toISOString().split("T")[0]}
                                className="border rounded px-3 py-2 w-full"
                            />
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                            Tạo voucher
                        </button>
                    </form>

                </div>
            </div>
        </>
    );
}
