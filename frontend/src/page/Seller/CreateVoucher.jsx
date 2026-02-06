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

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [tenPercent, setTenPercent] = useState(0); // 10% của đơn tối thiểu

    useEffect(() => {
        const roleId = sessionStorage.getItem("roleId");
        if (roleId !== "3") {
            alert("Bạn không có quyền truy cập");
            navigate("/");
        }
    }, [navigate]);

    // Tính 10% của đơn tối thiểu
    useEffect(() => {
        if (form.MinOrderValue) {
            const minOrder = Number(form.MinOrderValue);
            const tenPercentValue = Math.floor(minOrder * 0.1);
            setTenPercent(tenPercentValue);
        }
    }, [form.MinOrderValue]);

    // Các option cho đơn tối thiểu (từ 100k trở lên)
    const minOrderOptions = [
        { value: "100000", label: "100.000đ (10% = 10.000đ)" },
        { value: "200000", label: "200.000đ (10% = 20.000đ)" },
        { value: "300000", label: "300.000đ (10% = 30.000đ)" },
        { value: "500000", label: "500.000đ (10% = 50.000đ)" },
        { value: "1000000", label: "1.000.000đ (10% = 100.000đ)" },
        { value: "2000000", label: "2.000.000đ (10% = 200.000đ)" },
        { value: "3000000", label: "3.000.000đ (10% = 300.000đ)" },
        { value: "5000000", label: "5.000.000đ (10% = 500.000đ)" },
    ];

    // Lọc các option cho MaxDiscount dựa trên 10% của đơn tối thiểu
    const getMaxDiscountOptions = () => {
        const allOptions = [
            { value: "10000", label: "10.000đ" },
            { value: "20000", label: "20.000đ" },
            { value: "30000", label: "30.000đ" },
            { value: "50000", label: "50.000đ" },
            { value: "100000", label: "100.000đ" },
            { value: "200000", label: "200.000đ" },
            { value: "300000", label: "300.000đ" },
            { value: "500000", label: "500.000đ" },
            { value: "1000000", label: "1.000.000đ" },
        ];

        // Nếu đã chọn đơn tối thiểu, lọc các option ≤ 10% đơn tối thiểu
        if (form.MinOrderValue) {
            return allOptions.filter(option => 
                Number(option.value) <= tenPercent
            );
        }
        
        return allOptions;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newForm = { ...form, [name]: value };

        // Reset các trường liên quan khi thay đổi loại giảm giá
        if (name === "DiscountType") {
            newForm.DiscountValue = "";
            newForm.MaxDiscount = "";
            setErrors({});
        }

        // Nếu thay đổi MinOrderValue, reset MaxDiscount nếu vượt quá 10%
        if (name === "MinOrderValue" && form.DiscountType === "percent") {
            const minOrder = Number(value) || 0;
            const tenPercentValue = Math.floor(minOrder * 0.1);
            
            if (newForm.MaxDiscount && Number(newForm.MaxDiscount) > tenPercentValue) {
                newForm.MaxDiscount = "";
                setErrors(prev => ({ 
                    ...prev, 
                    MaxDiscount: `Giảm tối đa phải ≤ 10% đơn tối thiểu (≤ ${tenPercentValue.toLocaleString()}đ)` 
                }));
            }
        }

        setForm(newForm);
        validateField(name, value);
    };

    // Validate real-time
    const validateField = (name, value) => {
        const newErrors = { ...errors };
        
        switch (name) {
            case "MinOrderValue":
                if (value && Number(value) < 100000) {
                    newErrors.MinOrderValue = "Đơn tối thiểu phải từ 100.000đ";
                } else {
                    delete newErrors.MinOrderValue;
                }
                break;
                
            case "DiscountValue":
                if (form.DiscountType === "percent") {
                    if (value && ![5, 10].includes(Number(value))) {
                        newErrors.DiscountValue = "Chỉ được chọn 5% hoặc 10%";
                    } else {
                        delete newErrors.DiscountValue;
                    }
                } else if (form.DiscountType === "fixed") {
                    const discount = Number(value) || 0;
                    
                    // Kiểm tra nếu đã chọn đơn tối thiểu
                    if (form.MinOrderValue) {
                        if (discount <= 0) {
                            newErrors.DiscountValue = "Giá trị giảm phải lớn hơn 0";
                        } else if (discount > tenPercent) {
                            newErrors.DiscountValue = `Giá trị giảm phải ≤ 10% đơn tối thiểu (≤ ${tenPercent.toLocaleString()}đ)`;
                        } else {
                            delete newErrors.DiscountValue;
                        }
                    } else if (value && discount <= 0) {
                        newErrors.DiscountValue = "Giá trị giảm phải lớn hơn 0";
                    } else {
                        delete newErrors.DiscountValue;
                    }
                }
                break;
                
            case "MaxDiscount":
                if (form.DiscountType === "percent") {
                    const maxDiscount = Number(value) || 0;
                    
                    if (value && maxDiscount > tenPercent) {
                        newErrors.MaxDiscount = `Giảm tối đa phải ≤ 10% đơn tối thiểu (≤ ${tenPercent.toLocaleString()}đ)`;
                    } else {
                        delete newErrors.MaxDiscount;
                    }
                }
                break;
                
            case "Quantity":
                if (value && (Number(value) < 1 || Number(value) > 500 || !Number.isInteger(Number(value)))) {
                    newErrors.Quantity = "Số lượng phải là số nguyên từ 1 đến 500";
                } else {
                    delete newErrors.Quantity;
                }
                break;
                
            case "EndTime":
                if (value) {
                    const today = new Date().setHours(0, 0, 0, 0);
                    const endDate = new Date(value).setHours(0, 0, 0, 0);
                    if (endDate <= today) {
                        newErrors.EndTime = "Ngày hết hạn phải sau ngày hiện tại";
                    } else {
                        delete newErrors.EndTime;
                    }
                }
                break;
                
            default:
                break;
        }
        
        setErrors(newErrors);
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Kiểm tra tất cả các trường
        validateField("MinOrderValue", form.MinOrderValue);
        validateField("DiscountValue", form.DiscountValue);
        validateField("MaxDiscount", form.MaxDiscount);
        validateField("Quantity", form.Quantity);
        validateField("EndTime", form.EndTime);
        
        // Kiểm tra tên voucher
        if (!form.VoucherName.trim()) {
            newErrors.VoucherName = "Vui lòng nhập tên voucher";
        }
        
        // Kiểm tra đã chọn đơn tối thiểu chưa
        if (!form.MinOrderValue) {
            newErrors.MinOrderValue = "Vui lòng chọn giá trị đơn tối thiểu";
        }
        
        // Kiểm tra riêng cho từng loại discount
        if (form.DiscountType === "percent") {
            if (!form.DiscountValue) {
                newErrors.DiscountValue = "Vui lòng chọn phần trăm giảm";
            }
            if (!form.MaxDiscount) {
                newErrors.MaxDiscount = "Vui lòng chọn mức giảm tối đa";
            }
        } else if (form.DiscountType === "fixed") {
            if (!form.DiscountValue) {
                newErrors.DiscountValue = "Vui lòng nhập giá trị giảm";
            }
        }
        
        setErrors(prev => ({ ...prev, ...newErrors }));
        return Object.keys({ ...errors, ...newErrors }).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            alert("Vui lòng kiểm tra lại thông tin");
            return;
        }

        setLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            
            await axios.post(
                "/vouchers/seller",
                {
                    ...form,
                    DiscountValue: Number(form.DiscountValue),
                    MinOrderValue: Number(form.MinOrderValue),
                    MaxDiscount: form.DiscountType === "percent"
                        ? Number(form.MaxDiscount)
                        : null,
                    Quantity: Number(form.Quantity),
                    EndTime: form.EndTime,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Tạo voucher thành công!");
            navigate("/seller/voucher");
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tạo voucher: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
                <SellerSidebar />

                <div className="flex-1 bg-white p-6 rounded-lg border border-black-300 shadow">
                    <h1 className="text-2xl font-bold mb-6">Tạo phiếu giảm giá mới</h1>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* TÊN VOUCHER */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Tên voucher <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="VoucherName"
                                value={form.VoucherName}
                                onChange={handleChange}
                                required
                                className={`border rounded px-3 py-2 w-full ${
                                    errors.VoucherName ? "border-red-500" : ""
                                }`}
                                placeholder="Nhập tên voucher"
                            />
                            {errors.VoucherName && (
                                <p className="text-red-500 text-sm mt-1">{errors.VoucherName}</p>
                            )}
                        </div>

                        {/* LOẠI GIẢM GIÁ */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Loại giảm giá <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="DiscountType"
                                value={form.DiscountType}
                                onChange={handleChange}
                                className="border rounded px-3 py-2 w-full"
                            >
                                <option value="percent">Giảm theo phần trăm</option>
                                <option value="fixed">Giảm tiền cố định</option>
                            </select>
                        </div>

                        {/* ĐƠN TỐI THIỂU */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Giá trị đơn tối thiểu <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="MinOrderValue"
                                value={form.MinOrderValue}
                                onChange={handleChange}
                                required
                                className={`border rounded px-3 py-2 w-full ${
                                    errors.MinOrderValue ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">-- Chọn giá trị tối thiểu --</option>
                                {minOrderOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.MinOrderValue && (
                                <p className="text-red-500 text-sm mt-1">{errors.MinOrderValue}</p>
                            )}
                        </div>

                        {/* GIÁ TRỊ GIẢM */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Giá trị giảm <span className="text-red-500">*</span>
                            </label>
                            
                            {form.DiscountType === "percent" ? (
                                <>
                                    <select
                                        name="DiscountValue"
                                        value={form.DiscountValue}
                                        onChange={handleChange}
                                        required
                                        className={`border rounded px-3 py-2 w-full ${
                                            errors.DiscountValue ? "border-red-500" : ""
                                        }`}
                                    >
                                        <option value="">-- Chọn phần trăm giảm --</option>
                                        <option value="5">5%</option>
                                        <option value="10">10%</option>
                                    </select>
                                    {errors.DiscountValue && (
                                        <p className="text-red-500 text-sm mt-1">{errors.DiscountValue}</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <input
                                        type="number"
                                        name="DiscountValue"
                                        value={form.DiscountValue}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                        className={`border rounded px-3 py-2 w-full ${
                                            errors.DiscountValue ? "border-red-500" : ""
                                        }`}
                                        placeholder="Nhập số tiền giảm (VNĐ)"
                                    />
                                    {errors.DiscountValue && (
                                        <p className="text-red-500 text-sm mt-1">{errors.DiscountValue}</p>
                                    )}
                                    {form.MinOrderValue && (
                                        <div className="flex items-center gap-2 mt-1">
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* GIẢM TỐI ĐA (CHỈ HIỆN KHI percent) */}
                        {form.DiscountType === "percent" && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Giảm tối đa (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="MaxDiscount"
                                    value={form.MaxDiscount}
                                    onChange={handleChange}
                                    required
                                    disabled={!form.MinOrderValue}
                                    className={`border rounded px-3 py-2 w-full ${
                                        errors.MaxDiscount ? "border-red-500" : ""
                                    } ${!form.MinOrderValue ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                >
                                    <option value="">{form.MinOrderValue ? "-- Chọn mức giảm tối đa --" : "-- Vui lòng chọn đơn tối thiểu trước --"}</option>
                                    {getMaxDiscountOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.MaxDiscount && (
                                    <p className="text-red-500 text-sm mt-1">{errors.MaxDiscount}</p>
                                )}
                            </div>
                        )}

                        {/* SỐ LƯỢNG VOUCHER */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Số lượng voucher <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="Quantity"
                                value={form.Quantity}
                                onChange={handleChange}
                                min="1"
                                max="500"
                                required
                                className={`border rounded px-3 py-2 w-full ${
                                    errors.Quantity ? "border-red-500" : ""
                                }`}
                                placeholder="Nhập số lượng (1-500)"
                            />
                            {errors.Quantity && (
                                <p className="text-red-500 text-sm mt-1">{errors.Quantity}</p>
                            )}
                        </div>

                        {/* NGÀY HẾT HẠN */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Ngày hết hạn <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="EndTime"
                                value={form.EndTime}
                                onChange={handleChange}
                                required
                                min={new Date().toISOString().split("T")[0]}
                                className={`border rounded px-3 py-2 w-full ${
                                    errors.EndTime ? "border-red-500" : ""
                                }`}
                            />
                            {errors.EndTime && (
                                <p className="text-red-500 text-sm mt-1">{errors.EndTime}</p>
                            )}
                        </div>

                        {/* NÚT TẠO VOUCHER */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !form.MinOrderValue}
                                className={`px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 ${
                                    loading || !form.MinOrderValue ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            >
                                {loading ? "Đang xử lý..." : "Tạo voucher"}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/seller/voucher")}
                                className="ml-4 px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Hủy
                            </button>
                        </div>
                    </form>

                    {/* THÔNG BÁO QUY TẮC MỚI */}
                    <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <h3 className="font-bold text-lg mb-2">Quy tắc tạo voucher:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Đơn tối thiểu: Từ 100.000đ trở lên</li>
                            <li>Giảm theo phần trăm: 
                                <ul className="list-circle pl-5 mt-1">
                                    <li>Chỉ được chọn 5% hoặc 10%</li>
                                    <li>Giảm tối đa phải ≤ 10% giá trị đơn tối thiểu</li>
                                </ul>
                            </li>
                            <li>Giảm cố định: 
                                <ul className="list-circle pl-5 mt-1">
                                    <li>Người bán tự nhập giá trị giảm</li>
                                    <li>Giá trị giảm phải ≤ 10% giá trị đơn tối thiểu</li>
                                </ul>
                            </li>
                            <li>Số lượng voucher: Từ 1 đến 500</li>
                            <li>Ngày hết hạn phải sau ngày hiện tại</li>
                        </ul>
                    </div>

                    {/* THÔNG TIN TÓM TẮT */}
                    {form.MinOrderValue && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                            <h4 className="font-bold text-blue-800 mb-2">Thông tin xác nhận:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <span className="font-medium">Đơn tối thiểu:</span> {Number(form.MinOrderValue).toLocaleString()}đ
                                </div>
                                <div>
                                    <span className="font-medium">10% đơn tối thiểu:</span> {tenPercent.toLocaleString()}đ
                                </div>
                                
                                {form.DiscountType === "percent" && (
                                    <>
                                        <div>
                                            <span className="font-medium">Phần trăm giảm:</span> {form.DiscountValue ? form.DiscountValue + "%" : "Chưa chọn"}
                                        </div>
                                        <div>
                                            <span className="font-medium">Giảm tối đa:</span> {form.MaxDiscount ? Number(form.MaxDiscount).toLocaleString() + "đ" : "Chưa chọn"}
                                        </div>
                                    </>
                                )}
                                
                                {form.DiscountType === "fixed" && form.DiscountValue && (
                                    <div className="md:col-span-2">
                                        <span className="font-medium">Giá trị giảm:</span> {Number(form.DiscountValue).toLocaleString()}đ
                                        {Number(form.DiscountValue) <= tenPercent ? (
                                            <span className="ml-2 text-green-600 text-sm">
                                                ✓ Hợp lệ (≤ {tenPercent.toLocaleString()}đ)
                                            </span>
                                        ) : (
                                            <span className="ml-2 text-red-600 text-sm">
                                                ✗ Vượt quá giới hạn 10%
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}