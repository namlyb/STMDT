const express = require("express");
const router = express.Router();
const VoucherController = require("../controllers/VoucherController");
const { verifyToken, verifyRole } = require("../middleware/auth");

// Tạo voucher
router.get("/random", verifyToken, VoucherController.getRandom);
router.get("/admin", verifyToken, verifyRole([1]), VoucherController.getByAdmin);
router.post("/", verifyToken, verifyRole([1]), VoucherController.create);
router.get("/:id", verifyToken, VoucherController.getById);
router.put("/:id", verifyToken, VoucherController.update);

// Route riêng cho seller tạo voucher (có validation)
router.post("/seller", verifyToken, verifyRole([3]), VoucherController.createForSeller);
// Lấy voucher của seller
router.get("/seller/:sellerId", verifyToken, VoucherController.getBySeller);

module.exports = router;
