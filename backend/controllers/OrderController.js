const Cart = require("../models/Cart");
const VoucherUsage = require("../models/VoucherUsage");
const Order = require("../models/Order");


const OrderController = {
  checkout: async (req, res) => {
    try {
      const { cartIds } = req.body;
      const accountId = req.user.AccountId; // giả sử verifyToken gắn req.user

      // 1️⃣ Lấy sản phẩm checkout
      const items = await Cart.getCheckoutItems(accountId, cartIds);

      // 2️⃣ Lấy voucher chưa dùng của user
      const userVouchers = await VoucherUsage.getUnusedByAccount(accountId);

      // 3️⃣ Gắn voucher cho từng sản phẩm theo StallId
      const itemsWithVouchers = items.map((item) => {
        const vouchers = userVouchers.filter(v => v.CreatedBy === 1 || v.StallId === item.StallId);
        return {
          ...item,
          Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`,
          vouchers,
          selectedVoucher: null
        };
      });

      res.json({ items: itemsWithVouchers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }

};

module.exports = OrderController;
