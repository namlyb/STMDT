const Cart = require("../models/Cart");

const CartController = {
  getMyCart: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const cartItems = await Cart.getByAccountId(accountId);
      res.json(cartItems);
    } catch (err) {
      console.error("Get cart error:", err);
      res.status(500).json({ message: "Lỗi lấy giỏ hàng" });
    }
  }
};

module.exports = CartController;
