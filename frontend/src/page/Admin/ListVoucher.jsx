import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import AdminLayout from "../../components/Admin/Sidebar";

export default function ListVoucher() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📄 pagination (GIỐNG ListProduct)
  const [page, setPage] = useState(1);
  const pageSize = 15;
    const renderConditionText = (condition) => {
  if (!condition) return "Không điều kiện";

  const value = Number(condition.replace(">=", ""));
  return `Đơn từ ${value.toLocaleString("vi-VN")} đ`;
};

const renderDiscount = (type, value) => {
  if (type === "percent") {
    return `${value} %`;
  }
  return `${Number(value).toLocaleString("vi-VN")} đ`;
};

const renderQuantityCell = (value, colorClass = "") => (
  <div className="grid grid-cols-3 text-right">
    <span className={`col-span-2 ${colorClass}`}>
      {value} Vé
    </span>
    <span></span>
  </div>
);


  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await axios.get("/vouchers/admin");
        setVouchers(res.data);
      } catch (err) {
        console.error("Lỗi lấy voucher admin:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, []);

  // ================= PAGINATION LOGIC =================
  const totalPages = Math.ceil(vouchers.length / pageSize);
  const pagedData = vouchers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center text-gray-500">Đang tải dữ liệu...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-white rounded-xl shadow p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-orange-500">
            🎟 Danh sách phiếu giảm giá
          </h1>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm text-center">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-4 py-3 text-center">Mã giảm giá</th>
                <th className="px-4 py-3 text-center">Gian hàng</th>
                <th className="px-4 py-3 text-center">Điều kiện</th>
                <th className="px-4 py-3 text-center">Giảm giá</th>
                <th className="px-4 py-3 text-center">Tổng phiếu</th>
                <th className="px-4 py-3 text-center">Đã nhận</th>
                <th className="px-4 py-3 text-center">Còn lại</th>
                <th className="px-4 py-3 text-center">Hạn sử dụng</th>
              </tr>
            </thead>

            <tbody>
  {pagedData.map((v) => {
    const conditionText = renderConditionText(v.ConditionText);
    const discountText = renderDiscount(v.DiscountType, v.Discount);

    return (
      <tr
        key={v.VoucherId}
        className="border-b hover:bg-orange-50 transition"
      >
        <td className="px-4 py-3 font-medium">
          {v.VoucherName}
        </td>

        <td className="px-4 py-3">
          {v.StallName}
        </td>

        <td className="px-4 py-3 text-center">
          {conditionText}
        </td>

        <td className="px-4 py-3 text-orange-600 font-semibold text-center">
          {discountText}
        </td>

        <td className="px-4 py-3">
  {renderQuantityCell(v.TotalQuantity)}
</td>

<td className="px-4 py-3">
  {renderQuantityCell(v.UsedQuantity, "text-red-500")}
</td>

<td className="px-4 py-3">
  {renderQuantityCell(
    v.TotalQuantity - v.UsedQuantity,
    "text-green-600"
  )}
</td>

        <td className="px-4 py-3 text-center">
          {new Date(v.EndTime).toLocaleDateString("vi-VN")}
        </td>
      </tr>
    );
  })}
</tbody>

          </table>
        </div>

        {/* PAGINATION – GIỐNG 100% ListProduct */}
        <div className="flex items-center justify-between mt-6">

          {/* PREV */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full border
              transition-all duration-200
              ${page === 1
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
            `}
          >
            <span className="text-lg">←</span>
            <span className="text-sm font-medium">Trước</span>
          </button>

          {/* PAGE NUMBER */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`
                  w-9 h-9 rounded-full text-sm font-semibold
                  transition-all duration-200
                  ${page === i + 1
                    ? "bg-orange-300 text-white shadow"
                    : "bg-orange-50 text-orange-500 hover:bg-orange-200 cursor-pointer"}
                `}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* NEXT */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full border
              transition-all duration-200
              ${page === totalPages || totalPages === 0
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
            `}
          >
            <span className="text-sm font-medium">Sau</span>
            <span className="text-lg">→</span>
          </button>

        </div>
      </div>
    </AdminLayout>
  );
}
