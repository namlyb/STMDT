const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const OrderController = require("../controllers/OrderController");

// Checkout: lấy danh sách sản phẩm đã chọn + voucher
router.post("/checkout", verifyToken, OrderController.checkout);
router.post("/checkout/buynow", verifyToken, OrderController.checkoutBuyNow);

// Lấy danh sách loại ship
router.get("/shiptypes", OrderController.getShipTypes);

// Tạo đơn hàng
router.post("/", verifyToken, OrderController.createOrder);
// Lấy thông tin đơn hàng của người dùng
router.get("/my-orders", verifyToken, OrderController.getMyOrders);

// Lấy chi tiết đơn hàng
router.get("/:orderId", verifyToken, OrderController.getOrderDetail);


module.exports = router;