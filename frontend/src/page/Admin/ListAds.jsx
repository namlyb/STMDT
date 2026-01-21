import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import AdminLayout from "../../components/Admin/Sidebar";
import { FiSettings } from "react-icons/fi";

export default function ListAds() {
  const [adsList, setAdsList] = useState([]);
  const [styles, setStyles] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showStyleTab, setShowStyleTab] = useState(false);
const [previewImage, setPreviewImage] = useState(null);

  const fetchAds = async () => {
    try {
      const res = await axios.get("/ads");
      // Build URL cho ảnh
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

  const toggleStatus = async (adId, currentStatus) => {
    const newStatus = Number(currentStatus) === 1 ? 0 : 1;

    const res = await axios.patch(`/ads/${adId}/status`, {
      status: newStatus,
    });

    // Cần confirm (style != 1)
    if (res.data.needConfirm) {
      const ad = adsList.find(a => a.AdsId === adId);
      const styleName = getStyleName(ad.StyleID);

      const ok = window.confirm(
        `Quảng cáo này đang được sử dụng tại "${styleName}". Bạn có muốn ngừng sử dụng quảng cáo này không?`
      );

      if (!ok) return;

      await axios.patch(`/ads/${adId}/status`, {
        status: 0,
        confirm: true,
      });
    }

    fetchAds();
  };




  const openStyleTab = (ad) => {
    setSelectedAd(ad);
    setShowStyleTab(true);
  };

  const chooseStyle = async (styleId) => {
    try {
      /**
       * BƯỚC 1:
       * Hỏi server xem có được đổi style không
       * (server sẽ kiểm tra status + style trống / đã có ảnh)
       */
      const res = await axios.patch(
        `/ads/${selectedAd.AdsId}/style`,
        { styleId }
      );

      /**
       * ❌ CASE: QUẢNG CÁO ĐANG TẮT (Status = 0)
       */
      if (res.data.message) {
        alert(res.data.message);
        return;
      }

      /**
       * ✅ CASE 1: STYLE TRỐNG (CHƯA CÓ ẢNH)
       */
      if (res.data.type === "empty_style") {
        const ok = window.confirm(
          `Bạn có chắc muốn chuyển ảnh này sang màn hình "${getStyleName(styleId)}" không?`
        );

        if (!ok) return;

        await axios.patch(
          `/ads/${selectedAd.AdsId}/confirm-style`,
          { newStyleId: styleId }
        );
      }

      /**
       * ⚠️ CASE 2: STYLE ĐÃ CÓ ẢNH KHÁC
       */
      if (res.data.type === "occupied_style") {
        const ok = window.confirm(
          `Màn hình "${getStyleName(styleId)}" hiện đang có ảnh khác.
        Nếu tiếp tục, ảnh cũ sẽ bị ẩn đi.
        Bạn có chắc chắn không?`
        );

        if (!ok) return;

        await axios.patch(
          `/ads/${selectedAd.AdsId}/confirm-style`,
          {
            newStyleId: styleId,
            occupiedAdId: res.data.occupiedAd.AdsId,
          }
        );
      }

      /**
       * BƯỚC CUỐI:
       * Reload danh sách + đóng popup
       */
      await fetchAds();
      setShowStyleTab(false);
      setSelectedAd(null);

    } catch (err) {
      /**
       * ❌ ERROR TỪ SERVER
       */
      alert(
        err.response?.data?.message ||
        "Không thể thay đổi trang hiển thị quảng cáo"
      );
    }
  };




  // Lấy tên style từ styleId
  const getStyleName = (styleId) => {
    const style = styles.find(s => s.StyleID === styleId);
    return style ? style.StyleName : "-";
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Danh sách Quảng cáo</h1>

      <div className="grid grid-cols-6 gap-4">
        {adsList.map((ad) => (
          <div
            key={ad.AdsId}
            className="bg-white rounded shadow p-4 flex flex-col items-center"
          >
            {ad.AdsImage ? (
              <div
  className="relative w-full h-40 mb-2 overflow-hidden rounded cursor-pointer"
  onClick={() => setPreviewImage(ad.AdsImage)}
>
  {/* Background blur */}
  <div
    className="absolute inset-0 bg-center bg-cover scale-110 blur-md"
    style={{ backgroundImage: `url(${ad.AdsImage})` }}
  />

  {/* Ảnh chính */}
  <img
    src={ad.AdsImage}
    alt="ads"
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
                className={`px-3 py-1 rounded text-white transition ${Number(ad.Status) === 1
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                  }`}
                onClick={() => toggleStatus(ad.AdsId, ad.Status)}
              >
                {Number(ad.Status) === 1 ? "Đang dùng" : "Ngừng dùng"}
              </button>



              <button
                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 cursor-pointer"
                onClick={() => openStyleTab(ad)}
              >
                <FiSettings />
                Chọn trang hiển thị
              </button>
            </div>

            {ad.StyleID && (
              <p className="mt-2 text-sm text-gray-500">
                Màn hình hiện tại: {getStyleName(ad.StyleID)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Style Tab Nổi luôn hiển thị khi chọn */}
      {showStyleTab && selectedAd && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-80 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">Chọn Trang hiển thị quảng cáo</h2>
            <div className="grid grid-cols-2 gap-2">
              {styles.map((style) => (
                <button
                  key={style.StyleID}
                  onClick={() => chooseStyle(style.StyleID)}
                  className="px-2 py-1 bg-orange-400 hover:bg-orange-500 rounded text-white text-sm transition cursor-pointer"
                >
                  {style.StyleName}
                </button>
              ))}
            </div>
            <button
              className="mt-3 px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-white w-full cursor-pointer"
              onClick={() => setShowStyleTab(false)}
            >
              Huỷ
            </button>
          </div>
          {styles
            .filter(style => style.StyleID !== 1)
            .map(style => {
              const occupiedAd = adsList.find(
                a => Number(a.StyleID) === Number(style.StyleID)
              );

              return (
                <button
                  key={style.StyleID}
                  onClick={() => chooseStyle(style.StyleID)}
                  className="border p-2 rounded text-left"
                >
                  <p className="font-semibold">{style.StyleName}</p>

                  {/* ✅ Nếu có ảnh */}
                  {occupiedAd ? (
                    <img
                      src={occupiedAd.AdsImage}
                      className="w-full h-20 object-cover mt-1 rounded"
                    />
                  ) : (
                    /* ✅ Nếu trống */
                    <p className="mt-1 text-sm text-gray-400 italic">
                      Trống (null)
                    </p>
                  )}
                </button>
              );
            })}
        </div>

      )}
      {previewImage && (
  <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
    <div className="relative bg-white rounded-lg shadow-xl p-3 pointer-events-auto">
      {/* Nút đóng */}
      <button
        onClick={() => setPreviewImage(null)}
        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 transition"

      >
        ✕
      </button>

      {/* Ảnh */}
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
