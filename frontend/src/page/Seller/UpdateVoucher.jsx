import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";

export default function UpdateVoucher() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");
    if (roleId !== "3") {
      alert("Bạn không có quyền truy cập");
      navigate("/");
    }
  }, [navigate]);

  const [form, setForm] = useState({
    VoucherName: "",
    DiscountType: "",
    DiscountValue: "",
    MaxDiscount: null,
    MinOrderValue: "",
    Quantity: "",
    EndTime: "",
  });

  const [oldEndTime, setOldEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const lockClass = "bg-gray-100 cursor-not-allowed";

  // ================= LOAD VOUCHER =================
  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(`/vouchers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setForm({
          VoucherName: res.data.VoucherName,
          DiscountType: res.data.DiscountType,
          DiscountValue: res.data.DiscountValue,
          MaxDiscount: res.data.MaxDiscount,
          MinOrderValue: res.data.MinOrderValue,
          Quantity: "",
          EndTime: res.data.EndTime.split("T")[0],
        });

        setOldEndTime(res.data.EndTime);
      } catch (err) {
        console.error(err);
        alert("Không thể tải voucher");
        navigate("/seller/voucher");
      }
    };

    fetchVoucher();
  }, [id, navigate]);

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantity = Number(form.Quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      alert("Số lượng phải từ 1 đến 500");
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");

      await axios.put(
        `/vouchers/${id}`,
        {
          Quantity: quantity,
          EndTime: form.EndTime,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Cập nhật voucher thành công!");
      navigate("/seller/voucher");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật voucher");
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
          <h1 className="text-2xl font-bold mb-6">Cập nhật voucher</h1>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* NAME */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tên voucher
              </label>
              <input
                value={form.VoucherName}
                disabled
                className={`border rounded px-3 py-2 w-full ${lockClass}`}
              />
            </div>

            {/* TYPE */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Loại giảm giá
              </label>
              <input
                value={
                  form.DiscountType === "percent"
                    ? "Theo %"
                    : "Giảm tiền cố định"
                }
                disabled
                className={`border rounded px-3 py-2 w-full ${lockClass}`}
              />
            </div>

            {/* DISCOUNT */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Giá trị giảm
              </label>
              <input
                value={
                  form.DiscountType === "percent"
                    ? `${form.DiscountValue}% (tối đa ${form.MaxDiscount?.toLocaleString()}đ)`
                    : `${Number(form.DiscountValue).toLocaleString()}đ`
                }
                disabled
                className={`border rounded px-3 py-2 w-full ${lockClass}`}
              />
            </div>

            {/* MIN ORDER */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Giá trị đơn tối thiểu
              </label>
              <input
                value={`${Number(form.MinOrderValue).toLocaleString()}đ`}
                disabled
                className={`border rounded px-3 py-2 w-full ${lockClass}`}
              />
            </div>

            {/* QUANTITY */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Số lượng thêm
              </label>
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

            {/* END TIME */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Ngày hết hạn
              </label>
              <input
                type="date"
                value={form.EndTime}
                disabled
                className={`border rounded px-3 py-2 w-full ${lockClass}`}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                {loading ? "Đang cập nhật..." : "Cập nhật voucher"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/seller/voucher")}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
