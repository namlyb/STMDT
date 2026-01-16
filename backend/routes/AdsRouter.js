const express = require("express");
const AdsController = require("../controllers/AdsController");
const router = express.Router();


// Lấy quảng cáo mới nhất theo StyleID
router.get("/style/:styleId", AdsController.getLatestAdByStyle);

module.exports = router;
