import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import AdminLayout from "../../components/Admin/Sidebar";

export default function CreateVoucher() {
  const navigate = useNavigate();
  const adminId = Number(sessionStorage.getItem("accountId"));

  const [form, setForm] = useState({
    VoucherName: "",
    DiscountType: "fixed",
    DiscountValue: "",
    MinOrderValue: 0,
    MaxDiscount: "",
    Quantity: "",
    EndTime: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.VoucherName ||
      !form.DiscountValue ||
      !form.Quantity ||
      !form.EndTime
    ) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    if (
      form.DiscountType === "percent" &&
      (!form.MaxDiscount || Number(form.MaxDiscount) <= 0)
    ) {
      setError("Vui lòng nhập mức giảm tối đa");
      return;
    }

    try {
      setLoading(true);

      await axios.post("/vouchers", {
        VoucherName: form.VoucherName,
        DiscountType: form.DiscountType,
        DiscountValue: Number(form.DiscountValue),
        MinOrderValue: Number(form.MinOrderValue),
        MaxDiscount:
          form.DiscountType === "percent"
            ? Number(form.MaxDiscount)
            : null,
        Quantity: Number(form.Quantity),
        EndTime: form.EndTime,
        CreatedBy: adminId,
      });

      navigate("/admin/vouchers");
    } catch (err) {
      console.error(err);
      setError("Tạo voucher thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-orange-500 mb-6">
          ➕ Tạo phiếu giảm giá (Admin)
        </h1>

        {error && (
          <div className="mb-4 bg-red-100 text-red-600 px-4 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* VOUCHER NAME */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tên voucher
            </label>
            <input
              type="text"
              name="VoucherName"
              value={form.VoucherName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="VD: ADMIN10"
            />
          </div>

          {/* MIN ORDER */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Điều kiện đơn hàng
            </label>
            <select
              name="MinOrderValue"
              value={form.MinOrderValue}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value={0}>Không điều kiện</option>
              <option value={10000}>Đơn từ 10.000đ</option>
              <option value={20000}>Đơn từ 20.000đ</option>
              <option value={50000}>Đơn từ 50.000đ</option>
              <option value={100000}>Đơn từ 100.000đ</option>
              <option value={200000}>Đơn từ 200.000đ</option>
              <option value={500000}>Đơn từ 500.000đ</option>
            </select>
          </div>

          {/* DISCOUNT TYPE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Loại giảm giá
            </label>
            <select
              name="DiscountType"
              value={form.DiscountType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="fixed">Giảm tiền</option>
              <option value="percent">Giảm theo %</option>
              <option value="ship">Phí vận chuyển</option>
            </select>
          </div>

          {/* DISCOUNT VALUE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Giá trị giảm
            </label>
            <input
              type="number"
              name="DiscountValue"
              value={form.DiscountValue}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder={
                form.DiscountType === "percent"
                  ? "VD: 10 (%)"
                  : "VD: 50000 (đ)"
              }
            />
          </div>

          {/* MAX DISCOUNT – chỉ hiện khi giảm % */}
          {form.DiscountType === "percent" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Giảm tối đa (đ)
              </label>
              <input
                type="number"
                name="MaxDiscount"
                value={form.MaxDiscount}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                placeholder="VD: 50000"
              />
            </div>
          )}

          {/* QUANTITY */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Số lượng voucher
            </label>
            <input
              type="number"
              name="Quantity"
              value={form.Quantity}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              min={1}
            />
          </div>

          {/* END TIME */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Hạn sử dụng
            </label>
            <input
              type="date"
              name="EndTime"
              value={form.EndTime}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/admin/vouchers")}
              className="px-4 py-2 rounded border"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded bg-orange-500 text-white"
            >
              {loading ? "Đang tạo..." : "Tạo voucher"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
