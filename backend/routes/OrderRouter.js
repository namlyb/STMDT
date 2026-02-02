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
// Lấy danh sách đơn hàng của user
router.get("/my-orders", verifyToken, OrderController.getMyOrders);

// Lấy chi tiết đơn hàng
router.get("/:orderId", verifyToken, OrderController.getOrderDetail);

// Hủy đơn hàng
router.put("/:orderId/cancel", verifyToken, OrderController.cancelOrder);

// Mua lại đơn hàng
router.post("/:orderId/reorder", verifyToken, OrderController.reorder);


module.exports = router;