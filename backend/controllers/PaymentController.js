const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const OrderModel = require('../models/Order');
const sepayConfig = require('../config/sepay');
const { pool } = require('../config/db');

const PaymentController = {
  // Tạo QR thanh toán cho đơn hàng
  createPayment: async (req, res) => {
    try {
      const { orderId } = req.body;
      const accountId = req.user.AccountId;

      const orderDetail = await OrderModel.getOrderDetailById(orderId, accountId);
      if (!orderDetail.order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      const order = orderDetail.order;
      if (order.Status !== 1) {
        return res.status(400).json({ message: 'Đơn hàng không ở trạng thái chờ thanh toán' });
      }

      // Tạo nội dung chuyển khoản
      const description = `STMDT${orderId}`;

      // Tạo URL ảnh QR theo định dạng SePay
      const qrUrl = `https://qr.sepay.vn/img?acc=${sepayConfig.bankAccount.accountNumber}&bank=${encodeURIComponent(sepayConfig.bankAccount.bankName)}&amount=${order.FinalPrice}&des=${encodeURIComponent(description)}`;

      // Lưu payment vào DB (nếu chưa có)
      let payment = await Payment.findByOrderId(orderId);
      if (!payment) {
        await Payment.create(orderId, order.FinalPrice, null, 'pending');
      } else if (payment.Status !== 'pending') {
        // Nếu đã có payment với trạng thái khác, tạo mới
        await Payment.create(orderId, order.FinalPrice, null, 'pending');
      }

      res.json({
        success: true,
        qr: qrUrl,        // trả về URL ảnh
        amount: order.FinalPrice,
        description: description,
        orderId: orderId
      });

    } catch (error) {
      console.error('Create payment error:', error.message);
      res.status(500).json({ message: 'Không thể tạo yêu cầu thanh toán' });
    }
  },

 handleWebhook: async (req, res) => {
  try {
    // Lấy raw body (Buffer) từ middleware express.raw
    const rawBody = req.body;
    const payload = rawBody.toString('utf8');
    console.log('🔥 Webhook received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw body:', payload);
    // ---- XÁC THỰC BẰNG API KEY (ƯU TIÊN) ----
    const authHeader = req.headers['authorization'];
    if (authHeader) {
    // Xử lý cả hai trường hợp: "ApiKey_" (cũ) và "Apikey " (mới)
    let receivedApiKey = null;
    if (authHeader.startsWith('ApiKey_')) {
        receivedApiKey = authHeader.substring(7); // bỏ 'ApiKey_'
    } else if (authHeader.startsWith('Apikey ')) {
        receivedApiKey = authHeader.substring(7); // 'Apikey ' cũng 7 ký tự (Apikey + space)
    } else if (authHeader.includes(' ')) {
        // fallback: lấy phần sau khoảng trắng đầu tiên
        receivedApiKey = authHeader.split(' ')[1];
    }
      if (receivedApiKey !== sepayConfig.webhookSecret) {
        console.warn('Invalid API Key');
        return res.status(401).json({ message: 'Invalid API Key' });
      }
      // Nếu API Key đúng, tiếp tục xử lý
    } 
    // ---- FALLBACK: kiểm tra chữ ký HMAC (nếu không có API Key) ----
    else {
      const signature = req.headers['x-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', sepayConfig.webhookSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('Invalid webhook signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }
    }

    // Parse payload
    const data = JSON.parse(payload);
    const { transaction_code, amount, description, status } = data;

    // Tìm orderId từ description (cần xử lý linh hoạt hơn)
    // Ví dụ description hiện tại: "119200845817-STMDT14-CHUYEN TIEN-OQCH0007ZXKO-MOMO119200845817MOMO"
    const match = description.match(/STMDT(\d+)/);
    if (!match) {
      return res.status(400).json({ message: 'Không tìm thấy orderId trong description' });
    }
    const orderId = parseInt(match[1]);

    // Tìm payment theo orderId
    const payment = await Payment.findByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy payment' });
    }

    // Cập nhật payment
    const transactionDate = new Date();
    await Payment.updateById(payment.PaymentId, transaction_code, 'completed', transactionDate);

    // Cập nhật trạng thái đơn hàng từ 1 -> 2
    await OrderModel.updateOrderStatus(orderId, 2);

    // Phát socket thông báo
    const io = req.app.get('io');
    io.to(`user_${orderId}`).emit('paymentSuccess', { orderId });

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Lỗi xử lý webhook' });
  }
},

  // Kiểm tra trạng thái thanh toán (dùng cho polling)
  checkPaymentStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const accountId = req.user.AccountId;

      const orderDetail = await OrderModel.getOrderDetailById(orderId, accountId);
      if (!orderDetail.order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      const payment = await Payment.findByOrderId(orderId);
      res.json({
        orderStatus: orderDetail.order.Status,
        paymentStatus: payment ? payment.Status : null
      });
    } catch (error) {
      console.error('Check payment status error:', error);
      res.status(500).json({ message: 'Lỗi kiểm tra trạng thái' });
    }
  }
};

module.exports = PaymentController;