import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Sidebar from "../../components/Buyer/Sidebar";
import axios from "../../components/lib/axios";

export default function UpdateAddress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // ====== CHECK ROLE ======
  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");
    if (roleId !== "2") {
      alert("Bạn không có quyền truy cập");
      navigate("/");
    }
  }, [navigate]);

  // ====== FETCH ADDRESS DETAIL ======
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(`/addresses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setName(res.data.Name);
        setPhone(res.data.Phone);
        setContent(res.data.Content);
      } catch (err) {
        alert("Không tìm thấy địa chỉ");
        navigate("/address");
      }
    };

    if (id && token) fetchDetail();
  }, [id, token, navigate]);

  // ====== SUBMIT UPDATE ======
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert("Nhập tên người nhận");
    if (!phone.trim()) return alert("Nhập số điện thoại");
    if (phone.length !== 10)
      return alert("Số điện thoại phải đúng 10 chữ số");
    if (!content.trim()) return alert("Nhập địa chỉ");

    try {
      setLoading(true);
      await axios.put(
        `/addresses/${id}`,
        {
          Name: name.trim(),
          Phone: phone.trim(),
          Content: content.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate("/address");
    } catch (err) {
      alert("Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (name || phone || content) {
      if (!window.confirm("Bạn chưa lưu, chắc chắn huỷ?")) return;
    }
    navigate("/address");
  };

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto mt-6 flex gap-6">
        <Sidebar />

        <div className="flex-1 bg-white border rounded p-6">
          <h2 className="text-xl font-semibold mb-6">Cập nhật địa chỉ</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên người nhận"
              className="w-full border rounded p-3"
            />

            <input
              value={phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setPhone(value);

                if (value.length > 10) {
                  setPhoneError("Số điện thoại không được quá 10 chữ số");
                } else {
                  setPhoneError("");
                }
              }}
              onBlur={() => {
                if (phone && phone.length !== 10) {
                  setPhoneError("Số điện thoại phải đúng 10 chữ số");
                }
              }}
              placeholder="Số điện thoại"
              className={`w-full border rounded p-3 ${
                phoneError ? "border-red-500" : ""
              }`}
            />
            {phoneError && (
              <p className="text-red-500 text-sm mt-1">{phoneError}</p>
            )}

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Địa chỉ chi tiết"
              className="w-full border rounded p-3"
              rows={4}
            />

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 text-white px-6 py-2 cursor-pointer rounded disabled:opacity-60"
              >
                {loading ? "Đang lưu..." : "Cập nhật"}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 rounded border cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100"
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
