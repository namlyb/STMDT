const express = require("express");
const AdsController = require("../controllers/AdsController");
const uploadAdsImage = require("../middleware/uploadAdsImage");
const { verifyToken, verifyRole } = require("../middleware/auth");
const router = express.Router();


// Lấy quảng cáo mới nhất theo StyleID
router.get("/", AdsController.getAll);
router.get("/style/:styleId", AdsController.getLatestByStyle);
router.patch("/:id/confirm-style", verifyToken, verifyRole([1]), AdsController.confirmUpdateStyle);
router.patch("/:id/status", verifyToken, verifyRole([1]), AdsController.updateStatus);
router.patch("/:id/style", verifyToken, verifyRole([1]), AdsController.updateStyle);

// Upload Ads Image
router.post(
  "/upload",
  uploadAdsImage.single("image"),
  AdsController.uploadAdsImage
);

module.exports = router;
