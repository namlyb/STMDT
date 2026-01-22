import { useEffect, useState, useMemo } from "react";
import axios from "../../components/lib/axios";
import AdminLayout from "../../components/Admin/Sidebar";
import { FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
  
export default function ListAds() {
  const navigate = useNavigate();
  const [adsList, setAdsList] = useState([]);
  const [styles, setStyles] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showStyleTab, setShowStyleTab] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // 📄 pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
  const roleId = sessionStorage.getItem("roleId");

  if (roleId !== "1") {
    alert("Bạn không có quyền truy cập");
    navigate("/");
  }
}, [navigate]);
  /* ================= FETCH DATA ================= */
  const fetchAds = async () => {
    try {
      const res = await axios.get("/ads");
      const adsWithURL = res.data.map(ad => ({
        ...ad,
        AdsImage: ad.AdsImage
          ? `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/uploads/AdsImage/${ad.AdsImage}`
          : null,
      }));
      setAdsList(adsWithURL);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStyles = async () => {
    try {
      const res = await axios.get("/styleAds");
      setStyles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAds();
    fetchStyles();
  }, []);

  /* ================= STATUS ================= */
  const toggleStatus = async (adId, currentStatus) => {
    const newStatus = Number(currentStatus) === 1 ? 0 : 1;

    const res = await axios.patch(`/ads/${adId}/status`, {
      status: newStatus,
    });

    if (res.data?.needConfirm) {
      const ad = adsList.find(a => a.AdsId === adId);
      const styleName = getStyleName(ad.StyleID);

      const ok = window.confirm(
        `Quảng cáo này đang hiển thị tại "${styleName}". Bạn có chắc muốn tắt không?`
      );
      if (!ok) return;

      await axios.patch(`/ads/${adId}/status`, {
        status: 0,
        confirm: true,
      });
    }

    fetchAds();
  };

  /* ================= UPLOAD ================= */
  const uploadAdsImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    await axios.post("/ads/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    fetchAds();
  };

  /* ================= STYLE ================= */
  const openStyleTab = (ad) => {
    setSelectedAd(ad);
    setShowStyleTab(true);
  };

  const chooseStyle = async (styleId) => {
    try {
      if (Number(selectedAd.StyleID) === Number(styleId)) {
        alert("Ảnh này đã được sử dụng ở trang này");
        setShowStyleTab(false);
        setSelectedAd(null);
        return;
      }

      const res = await axios.patch(
        `/ads/${selectedAd.AdsId}/style`,
        { styleId }
      );

      if (res.data.message) {
        alert(res.data.message);
        return;
      }

      if (res.data.type === "empty_style") {
        const ok = window.confirm(
          `Bạn có chắc muốn chuyển ảnh sang "${getStyleName(styleId)}" không?`
        );
        if (!ok) return;

        await axios.patch(`/ads/${selectedAd.AdsId}/confirm-style`, {
          newStyleId: styleId,
        });
      }

      if (res.data.type === "occupied_style") {
        const ok = window.confirm(
          `Trang "${getStyleName(styleId)}" đã có ảnh khác. Ảnh cũ sẽ bị ẩn. Bạn có chắc không?`
        );
        if (!ok) return;

        await axios.patch(`/ads/${selectedAd.AdsId}/confirm-style`, {
          newStyleId: styleId,
          occupiedAdId: res.data.occupiedAd.AdsId,
        });
      }

      fetchAds();
      setShowStyleTab(false);
      setSelectedAd(null);
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Không thể thay đổi trang hiển thị quảng cáo"
      );
    }
  };

  /* ================= FILTER ================= */
  const filteredAds = useMemo(() => {
    return adsList.filter(ad => {
      if (filterStatus === "all") return true;
      return String(ad.Status) === filterStatus;
    });
  }, [adsList, filterStatus]);

  // reset page khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredAds.length / pageSize);

  const pagedAds = filteredAds.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  /* ================= HELPERS ================= */
  const getStyleName = (styleId) => {
    const style = styles.find(s => Number(s.StyleID) === Number(styleId));
    return style ? style.StyleName : "-";
  };

  /* ================= RENDER ================= */
  return (
    <AdminLayout>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Danh sách Quảng cáo</h1>

        <div className="flex gap-3 items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">Tất cả</option>
            <option value="1">Hoạt động</option>
            <option value="0">Ngưng sử dụng</option>
          </select>

          <label className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded cursor-pointer text-sm">
            Thêm quảng cáo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  uploadAdsImage(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* LIST ADS */}
      <div className="grid grid-cols-6 gap-4">
        {pagedAds.map(ad => (
          <div
            key={ad.AdsId}
            className="bg-white rounded shadow p-4 flex flex-col items-center"
          >
            {ad.AdsImage ? (
              <div
                className="relative w-full h-40 mb-2 overflow-hidden rounded cursor-pointer"
                onClick={() => setPreviewImage(ad.AdsImage)}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center scale-110 blur-md"
                  style={{ backgroundImage: `url(${ad.AdsImage})` }}
                />
                <img
                  src={ad.AdsImage}
                  className="relative z-10 w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-200 flex items-center justify-center mb-2">
                Chưa có ảnh
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => toggleStatus(ad.AdsId, ad.Status)}
                className={`px-3 py-1 rounded text-white transition ${
                  Number(ad.Status) === 1
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {Number(ad.Status) === 1 ? "Đang dùng" : "Ngừng dùng"}
              </button>

              <button
                onClick={() => openStyleTab(ad)}
                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 cursor-pointer"
              >
                <FiSettings />
                Chọn trang
              </button>
            </div>

            {ad.StyleID && (
              <p className="mt-2 text-sm text-gray-500">
                Màn hình: {getStyleName(ad.StyleID)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* PAGINATION (giống ListProduct) */}
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
              : "bg-white text-orange-500 border-orange-300 hover:bg-orange-500 hover:text-white cursor-pointer"}
          `}
        >
          ← Trước
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
                  ? "bg-orange-300 text-white"
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
              : "bg-white text-orange-500 border-orange-300 hover:bg-orange-500 hover:text-white cursor-pointer"}
          `}
        >
          Sau →
        </button>
      </div>

      {/* STYLE POPUP */}
      {showStyleTab && selectedAd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-5 w-96">
            <h2 className="text-lg font-bold mb-3">Chọn Trang hiển thị</h2>

            <div className="grid grid-cols-2 gap-3">
              {styles
                .filter(s => s.StyleID !== 1)
                .map(style => {
                  const occupiedAd = adsList.find(
                    a => Number(a.StyleID) === Number(style.StyleID)
                  );

                  return (
                    <button
                      key={style.StyleID}
                      onClick={() => chooseStyle(style.StyleID)}
                      className="border rounded p-2 text-left hover:bg-gray-50"
                    >
                      <p className="font-semibold">{style.StyleName}</p>

                      {occupiedAd ? (
                        <img
                          src={occupiedAd.AdsImage}
                          className="w-full h-20 object-cover mt-1 rounded"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-400 italic">
                          Trống (null)
                        </p>
                      )}
                    </button>
                  );
                })}
            </div>

            <button
              onClick={() => setShowStyleTab(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="relative bg-white rounded-lg p-3">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600"
            >
              ✕
            </button>

            <img
              src={previewImage}
              className="max-w-[80vw] max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
