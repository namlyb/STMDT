const express = require("express");
const router = express.Router();
const VoucherUsageController = require("../controllers/VoucherUsageController");
const { verifyToken } = require("../middleware/auth");

// User lưu voucher
router.post("/save", verifyToken, VoucherUsageController.saveVoucher);

// Lấy voucher user đã lưu
router.get("/me", verifyToken, VoucherUsageController.getMyVouchers);

module.exports = router;
