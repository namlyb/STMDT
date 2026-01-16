const Cart = require("../models/Cart");

const CartController = {
  getMyCart: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const cartItems = await Cart.getByAccountId(accountId);

      const result = cartItems.map(item => ({
        ...item,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${item.Image}`
      }));

      res.json(result);
    } catch (err) {
      console.error("Get cart error:", err);
      res.status(500).json({ message: "Lỗi lấy giỏ hàng" });
    }
  },

  addToCart: async (req, res) => {
  try {
    const accountId = req.user.AccountId;
    const { productId, quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    await Cart.addToCart(accountId, productId, quantity);
    res.json({ message: "Đã thêm vào giỏ hàng" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi thêm vào giỏ hàng" });
  }
},

updateQuantity: async (req, res) => {
  try {
    const { cartId, quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    await Cart.updateQuantity(cartId, quantity);
    res.json({ message: "Cập nhật số lượng thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật số lượng" });
  }
},

// CartController.js
toggleSelect: async (req, res) => {
  try {
    const { cartId, isSelected } = req.body;
    await Cart.toggleSelect(cartId, isSelected);
    res.json({ message: "OK" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi select cart" });
  }
},


  // Xóa sản phẩm khỏi giỏ (soft delete)
  removeCartItem: async (req, res) => {
    try {
      const { id } = req.params; // CartId
      await Cart.removeCartItem(id);
      res.json({ message: "Đã xóa sản phẩm khỏi giỏ hàng" });
    } catch (err) {
      console.error("Remove cart item error:", err);
      res.status(500).json({ message: "Lỗi xóa sản phẩm" });
    }
  }

};

module.exports = CartController;
