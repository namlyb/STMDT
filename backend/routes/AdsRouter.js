const express = require("express");
const AdsController = require("../controllers/AdsController");
const router = express.Router();


// Lấy quảng cáo mới nhất theo StyleID
router.get("/", AdsController.getAll);
router.get("/style/:styleId", AdsController.getLatestByStyle);
router.patch("/:id/confirm-style", AdsController.confirmUpdateStyle);

router.patch("/:id/status", AdsController.updateStatus);
router.patch("/:id/style", AdsController.updateStyle);


module.exports = router;
