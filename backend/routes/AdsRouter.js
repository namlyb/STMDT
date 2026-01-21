const express = require("express");
const AdsController = require("../controllers/AdsController");
const uploadAdsImage = require("../middleware/uploadAdsImage");
const router = express.Router();


// Lấy quảng cáo mới nhất theo StyleID
router.get("/", AdsController.getAll);
router.get("/style/:styleId", AdsController.getLatestByStyle);
router.patch("/:id/confirm-style", AdsController.confirmUpdateStyle);
router.patch("/:id/status", AdsController.updateStatus);
router.patch("/:id/style", AdsController.updateStyle);

// Upload Ads Image
router.post(
  "/upload",
  uploadAdsImage.single("image"),
  AdsController.uploadAdsImage
);

module.exports = router;
