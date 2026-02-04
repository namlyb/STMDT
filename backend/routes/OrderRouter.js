const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const OrderController = require("../controllers/OrderController");

// ================== ROUTES FOR BUYER ==================

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
// ================== ROUTES FOR SELLER ==================

// Lấy danh sách đơn hàng của seller
router.get("/seller/orders", verifyToken, OrderController.getSellerOrders);

// Lấy chi tiết đơn hàng cho seller
router.get("/seller/orders/:orderId", verifyToken, OrderController.getSellerOrderDetail);

// Cập nhật trạng thái chuẩn bị hàng
router.put("/seller/order-details/:orderDetailId/prepare", verifyToken, OrderController.prepareOrderItem);

// Chuyển trạng thái đơn hàng sang đang giao
router.put("/seller/orders/:orderId/ship", verifyToken, OrderController.shipSellerOrder);

// Xác nhận hoàn thành đơn hàng
router.put("/seller/order-details/:orderDetailId/complete", verifyToken, OrderController.completeSellerOrder);
// Chuyển tất cả sản phẩm sang vận chuyển
router.put("/seller/orders/:orderId/ship-all", verifyToken, OrderController.shipAllItemsForSeller);
router.get("/seller/order-details/:orderDetailId/check", verifyToken, OrderController.checkOrderDetailStatus);

module.exports = router;