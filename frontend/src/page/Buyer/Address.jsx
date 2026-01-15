import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Sidebar from "../../components/Buyer/Sidebar";
import axios from "../../components/lib/axios";

export default function Address() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  // ================= FETCH ADDRESS =================
  const fetchAddress = async () => {
    try {
      const res = await axios.get("/addresses/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAddress();
  }, [token]);

  // ================= DELETE ADDRESS =================
  const handleDelete = async (id) => {
    const ok = window.confirm("Bạn có chắc muốn xóa địa chỉ này?");
    if (!ok) return;

    try {
      await axios.delete(`/addresses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAddress(); // reload list
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại");
    }
  };

  return (
    <>
      <Header />

      <div className="max-w-[1200px] mx-auto mt-6 flex gap-6">
        <Sidebar />

        <div className="flex-1 bg-white border rounded p-6">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Địa chỉ của tôi</h2>
            <button
              onClick={() => navigate("/address/add")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            >
              + Thêm địa chỉ
            </button>
          </div>

          {/* CONTENT */}
          {loading ? (
            <p>Đang tải...</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500">Chưa có địa chỉ</p>
          ) : (
            <div className="space-y-4">
              {list.map((item) => (
                <div
                  key={item.AddressId}
                  className="border rounded-lg p-4 flex justify-between items-start hover:shadow transition"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {item.Content}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(item.AddressId)}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    Xóa
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
