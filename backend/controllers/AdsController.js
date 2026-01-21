const Ads = require("../models/Ads");

const AdsController = {
  // Lấy tất cả Ads
  getAll: async (req, res) => {
    try {
      const list = await Ads.getAll();
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy Ads theo ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const ad = await Ads.getById(id);
      if (!ad) return res.status(404).json({ message: "Không tồn tại" });
      res.json(ad);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy Ads mới nhất theo StyleID
  getLatestByStyle: async (req, res) => {
    try {
      const { styleId } = req.params;
      const ad = await Ads.getLatestByStyleId(styleId);
      if (!ad) return res.json(null);

      ad.AdsImage = `${req.protocol}://${req.get("host")}/uploads/AdsImage/${ad.AdsImage}`;
      res.json(ad);
    } catch (err) {
      res.status(500).json({ message: "Lỗi server" });
    }
  },


  // Cập nhật status của Ads
  updateStatus: async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confirm } = req.body;

    const ad = await Ads.getById(id);
    if (!ad) {
      return res.status(404).json({ message: "Ads không tồn tại" });
    }

    // Chỉ xử lý khi tắt
    if (Number(status) === 0) {
      // Style = 1 → cho tắt luôn
      if (ad.StyleID === 1) {
        await Ads.updateStatus(id, 0);
        return res.json({ done: true });
      }

      // Style != 1 → cần confirm
      if (!confirm) {
        return res.json({
          needConfirm: true,
          styleId: ad.StyleID,
        });
      }

      // Confirm OK → tắt + cho về style 1
      await Ads.updateStatusAndStyle(id, 0, 1);
      return res.json({ done: true });
    }

    // Bật lại
    await Ads.updateStatus(id, 1);
    res.json({ done: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
},



  // Cập nhật StyleID của Ads
  updateStyle: async (req, res) => {
  try {
    const { id } = req.params;
    const { styleId } = req.body;

    const adA = await Ads.getById(id);
    if (!adA) {
      return res.status(404).json({ message: "Ads không tồn tại" });
    }

    // 🚫 KHÔNG cho đổi style khi status = 0
    if (adA.Status === 0) {
      return res.status(400).json({
        message: "Quảng cáo này đang ở trạng thái ngưng sử dụng hãy bật trạng thái sử dụng lên!",
      });
    }

    const adC = await Ads.getByStyleId(styleId);

    if (!adC) {
      return res.json({
        type: "empty_style",
        fromStyle: adA.StyleID,
        toStyle: styleId,
      });
    }

    return res.json({
      type: "occupied_style",
      fromStyle: adA.StyleID,
      toStyle: styleId,
      occupiedAd: {
        AdsId: adC.AdsId,
        AdsImage: adC.AdsImage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
},


confirmUpdateStyle: async (req, res) => {
  const { id } = req.params;
  const { newStyleId, occupiedAdId } = req.body;

  // Ảnh A → style mới
  await Ads.updateStyle(id, newStyleId);

  // Nếu có ảnh C → cho về Style 1
  if (occupiedAdId) {
    await Ads.updateStyle(occupiedAdId, 1);
  }

  res.json({ message: "Cập nhật style thành công" });
},

};

module.exports = AdsController;
