const Ads = require("../models/Ads");

const AdsController = {
  async getLatestAdByStyle(req, res) {
  try {
    const { styleId } = req.params;

    const ad = await Ads.getLatestByStyleId(styleId);
    if (!ad) return res.json(null);

    ad.AdsImage = `${req.protocol}://${req.get("host")}/uploads/AdsImage/${ad.AdsImage}`;

    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
}

};

module.exports = AdsController;
