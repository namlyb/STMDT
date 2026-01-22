const Cart = require("../models/Cart");
const VoucherUsage = require("../models/VoucherUsage");

const OrderController = {
  checkout: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { cartIds } = req.body;

      if (!cartIds || !cartIds.length) {
        return res.status(400).json({ message: "Chưa chọn sản phẩm" });
      }

      // Lấy sản phẩm trong giỏ hàng theo cartIds
      const cartItems = await Cart.getByIds(accountId, cartIds);

      // Lấy voucher khả dụng cho account
      //const vouchers = await VoucherUsage.getAvailableByAccount(accountId);
        const vouchers = []; // chx co code vourcher

      res.json({ cartItems, vouchers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi khi checkout" });
    }
  }
};

module.exports = OrderController;
