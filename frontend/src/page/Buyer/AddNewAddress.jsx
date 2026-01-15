import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Sidebar from "../../components/Buyer/Sidebar";
import axios from "../../components/lib/axios";

export default function AddNewAddress() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return alert("Nhập địa chỉ");

    try {
      setLoading(true);
      await axios.post(
        "/addresses",
        { Content: content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/address");
    } catch (err) {
      alert("Thêm thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto mt-6 flex gap-6">
        <Sidebar />
        <div className="flex-1 bg-white border rounded p-6">
          <h2 className="text-xl font-semibold mb-6">Thêm địa chỉ</h2>

          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border rounded p-3"
              rows={4}
            />
            <div className="mt-4 flex gap-4">
              <button
                className="bg-orange-500 text-white px-6 py-2 rounded"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/address")}
                className="border px-6 py-2 rounded"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
