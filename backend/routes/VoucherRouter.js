const express = require("express");
const router = express.Router();
const VoucherController = require("../controllers/VoucherController");
const { verifyToken } = require("../middleware/auth");

// Tạo voucher
router.post("/", verifyToken, VoucherController.create);
router.get("/:id", verifyToken, VoucherController.getById);

// Lấy voucher của seller
router.get("/seller/:sellerId", verifyToken, VoucherController.getBySeller);

module.exports = router;
