const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const OrderController = require("../controllers/OrderController");

// Checkout: lấy danh sách sản phẩm đã chọn + voucher
router.post("/checkout", verifyToken, OrderController.checkout);

router.post("/checkout/buynow", verifyToken, OrderController.checkoutBuyNow);
module.exports = router;
