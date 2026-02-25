const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const PaymentController = require('../controllers/PaymentController');

// Tạo QR thanh toán (yêu cầu đăng nhập)
router.post('/create', verifyToken, PaymentController.createPayment);

// Webhook từ SePay (public, không cần auth)
router.post('/webhook/sepay', PaymentController.handleWebhook);

// Kiểm tra trạng thái thanh toán (có thể dùng polling)
router.get('/status/:orderId', verifyToken, PaymentController.checkPaymentStatus);

module.exports = router;