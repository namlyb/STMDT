const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const FeedbackController = require("../controllers/FeedbackController");
const upload = require("../middleware/UploadFeedbackImage");

// ==================== BUYER ROUTES ====================

// Lấy danh sách sản phẩm trong đơn hàng để feedback
router.get("/order/:orderId/products", verifyToken, FeedbackController.getOrderProductsForFeedback);

// Lấy chi tiết sản phẩm để feedback
router.get("/product/:orderDetailId", verifyToken, FeedbackController.getProductFeedbackDetail);

// Tạo feedback
router.post("/", verifyToken, upload.array('Images', 5), FeedbackController.createFeedback);

// Lấy feedback của user
router.get("/my-feedbacks", verifyToken, FeedbackController.getMyFeedbacks);

// Cập nhật feedback
router.put("/:feedbackId", verifyToken, FeedbackController.updateFeedback);

// Xóa feedback
router.delete("/:feedbackId", verifyToken, FeedbackController.deleteFeedback);

// ==================== PUBLIC ROUTES ====================

// Lấy feedback theo sản phẩm (public)
router.get("/product/:productId/public", FeedbackController.getProductFeedbacks);

// Lấy feedback theo stall (public)
router.get("/stall/:stallId/public", FeedbackController.getStallFeedbacks);

// Lấy chi tiết feedback (public)
router.get("/:feedbackId/public", FeedbackController.getFeedbackDetail);

// Kiểm tra có thể feedback không (private)
router.get("/check/:orderDetailId", verifyToken, FeedbackController.checkFeedbackEligibility);

module.exports = router;