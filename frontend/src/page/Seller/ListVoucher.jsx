import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";

export default function SellerListVoucher() {
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  const DISCOUNTTYPE_LABELS = {
    percent: "Theo phần trăm",
    fixed: "Giá cố định",
  };

  const CONDITION_LABELS = {
    ">=0": "Đơn từ 0đ",
    ">=10000": "Đơn từ 10.000đ",
    ">=20000": "Đơn từ 20.000đ",
    ">=50000": "Đơn từ 50.000đ",
    ">=100000": "Đơn từ 100.000đ",
    ">=200000": "Đơn từ 200.000đ",
    ">=500000": "Đơn từ 500.000đ",
    ">=1000000": "Đơn từ 1.000.000đ",
    ">=2000000": "Đơn từ 2.000.000đ",
  };

  // CHECK ROLE
  useEffect(() => {
    if (!account || Number(account.RoleId) !== 3) {
      alert("Bạn không có quyền truy cập!");
      navigate("/");
    }
  }, [account, navigate]);

  // LOAD VOUCHERS
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await axios.get(
          `/vouchers/seller/${account.AccountId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setVouchers(res.data);
      } catch (err) {
        console.error("Fetch vouchers error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, [account]);

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
        <SellerSidebar />

        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Danh sách phiếu giảm giá</h1>
            <button
              onClick={() => navigate("/seller/voucher/create")}
              className="px-4 py-2 bg-orange-500 cursor-pointer text-white rounded hover:bg-orange-600"
            >
              Tạo phiếu giảm giá mới
            </button>
          </div>

          {loading ? (
            <p>Đang tải...</p>
          ) : vouchers.length === 0 ? (
            <p>Bạn chưa có voucher nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchers.map((v) => (
                <div
                  key={v.VoucherId}
                  className="border rounded-lg p-4 shadow hover:shadow-lg transition"
                >
                  <h3 className="font-semibold text-lg">{v.VoucherName}</h3>
                  <p>Loại: {DISCOUNTTYPE_LABELS[v.DiscountType]}</p>
                  <p>
                    Giá trị:{" "}
                    {v.DiscountType === "percent"
                      ? `${v.Discount}%`
                      : `${v.Discount.toLocaleString("vi-VN")}đ`}
                  </p>
                  <p>Tổng số phiếu: {v.TotalQuantity} Phiếu</p>
                  {/*<p>Đã dùng: {v.UsedQuantity} Phiếu</p>*/}
                  <p>Còn lại: {v.Quantity} Phiếu</p>
                  <p>
                    Điều kiện:{" "}
                    {CONDITION_LABELS[v.ConditionText] || v.ConditionText}
                  </p>
                  <p>
                    Hết hạn:{" "}
                    {new Date(v.EndTime).toLocaleDateString("vi-VN")}
                  </p>

                  <button
                    onClick={() =>
                      navigate(`/seller/voucher/update/${v.VoucherId}`)
                    }
                    className="mt-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Cập nhật voucher
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
