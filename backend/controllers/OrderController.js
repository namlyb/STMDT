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

      const itemVouchers = userVouchers.filter(
        v =>
          v.DiscountType !== "ship" &&
          (v.CreatedBy === item.SellerAccountId)
      );

      const orderVouchers = userVouchers.filter(
        v => v.CreatedBy === 1
      );


      res.json({ items: itemsWithVouchers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  checkoutBuyNow: async (req, res) => {
    try {
      const accountId = req.user.AccountId;
      const { productId, quantity } = req.body;

      const rows = await Order.checkoutBuyNow(
        accountId,
        productId,
        quantity
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }

      // 🎯 gom thành 1 item
      const base = rows[0];

      const item = {
        CartId: null,
        ProductId: base.ProductId,
        ProductName: base.ProductName,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${base.Image}`,
        Quantity: Number(base.Quantity),
        UnitPrice: Number(base.UnitPrice),
        totalPrice: Number(base.totalPrice),
        StallId: base.StallId,
        SellerAccountId: base.SellerAccountId,
        vouchers: [],
        selectedVoucher: null
      };

      // 🎟 gom voucher
      item.vouchers = rows
        .filter(r => r.VoucherId)
        .map(r => ({
          UsageId: r.UsageId,
          VoucherId: r.VoucherId,
          VoucherName: r.VoucherName,
          DiscountType: r.DiscountType,
          Discount: r.Discount,
          CreatedBy: r.CreatedBy
        }));

      return res.json({ items: [item] });
    } catch (err) {
      console.error("checkoutBuyNow:", err);
      return res.status(500).json({ message: "Checkout buy now failed" });
    }
  },


};

module.exports = OrderController;
