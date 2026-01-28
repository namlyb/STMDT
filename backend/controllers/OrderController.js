const Order = require("../models/Order");
const ShipType = require("../models/ShipType");

const OrderController = {
  checkout: async (req, res) => {
    try {
      const { cartIds } = req.body;
      const accountId = req.user.AccountId;

      // 1️⃣ Lấy sản phẩm checkout
      const items = await Order.getCheckoutItems(accountId, cartIds);

      // 2️⃣ Lấy voucher toàn đơn (chỉ admin, tất cả loại)
      const orderVouchers = await Order.getOrderVouchers(accountId);

      // 3️⃣ Lấy tất cả voucher để kiểm tra trùng
      const allVouchers = await Order.getAllVouchers(accountId);

      // 4️⃣ Format image URL
      const itemsWithImages = items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      res.json({ 
        items: itemsWithImages,
        orderVouchers,
        allVouchers // Gửi thêm để client có thể kiểm tra trùng
      });

    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  checkoutBuyNow: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { productId, quantity } = req.body;

      // 1️⃣ Lấy sản phẩm
      const items = await Order.checkoutBuyNow(accountId, productId, quantity);

      if (!items.length) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      // 2️⃣ Lấy voucher toàn đơn
      const orderVouchers = await Order.getOrderVouchers(accountId);

      // 3️⃣ Format image URL
      const itemsWithImages = items.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      return res.json({ 
        items: itemsWithImages,
        orderVouchers 
      });

    } catch (err) {
      console.error("checkoutBuyNow:", err);
      return res.status(500).json({ message: "Checkout buy now failed" });
    }
  },

  // API để lấy danh sách ship type
  getShipTypes: async (req, res) => {
    try {
      const shipTypes = await ShipType.getAll();
      res.json(shipTypes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // API tạo đơn hàng
  createOrder: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const {
        addressId,
        items, // Array of { productId, quantity, selectedVoucherId, selectedShipTypeId }
        orderVoucherId,
        paymentMethodId
      } = req.body;

      // TODO: Triển khai logic tạo đơn hàng
      // 1. Validate dữ liệu
      // 2. Tính toán giá trị
      // 3. Tạo Order và OrderDetails
      // 4. Cập nhật trạng thái voucher
      // 5. Xóa cart items nếu có

      res.json({ message: "Đặt hàng thành công", orderId: 123 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }
};

module.exports = OrderController;