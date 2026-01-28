const { pool } = require("../config/db");

const Order = {
  getByIds: async (accountId, cartIds) => {
    const sql = `
      SELECT
        c.CartId,
        c.Quantity,
        c.UnitPrice,
        p.ProductId,
        p.ProductName,
        p.Description,
        p.Image
      FROM Carts c
      JOIN Products p ON c.ProductId = p.ProductId
      WHERE c.AccountId = ?
        AND c.CartId IN (?)
        AND c.Status = 1
    `;

    const [rows] = await pool.query(sql, [accountId, cartIds]);
    return rows;
  },

   getCheckoutItems: async (accountId, cartIds) => {
    try {
      // Lấy thông tin sản phẩm từ cart
      const placeholders = cartIds.map(() => "?").join(",");
      const cartParams = [accountId, ...cartIds];
      
      const [cartItems] = await pool.query(
        `
        SELECT 
          c.CartId,
          c.Quantity,
          c.UnitPrice,
          (c.Quantity * c.UnitPrice) AS totalPrice,
          p.ProductId,
          p.ProductName,
          p.Image,
          s.StallId,
          s.AccountId AS SellerAccountId
        FROM Carts c
        JOIN Products p ON p.ProductId = c.ProductId
        JOIN Stalls s ON s.StallId = p.StallId
        WHERE c.AccountId = ?
          AND c.CartId IN (${placeholders})
          AND c.Status = 1
        `,
        cartParams
      );

      if (cartItems.length === 0) return [];

      // Lấy voucher SẢN PHẨM của account (CHỈ LOẠI fixed, percent)
      const [itemVouchers] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy,
          s.StallId
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
          AND v.DiscountType IN ('fixed', 'percent')
        `,
        [accountId]
      );

      // Gắn voucher sản phẩm phù hợp cho từng sản phẩm
      const itemsWithVouchers = cartItems.map(item => {
        // Voucher sản phẩm: từ Admin (CreatedBy = 1) hoặc từ chính Stall
        const productVouchers = itemVouchers.filter(v => 
          v.CreatedBy === 1 || v.StallId === item.StallId
        );

        return {
          ...item,
          vouchers: productVouchers,
          selectedVoucher: null,
          selectedShipType: null
        };
      });

      return itemsWithVouchers;
    } catch (error) {
      console.error("Error in getCheckoutItems:", error);
      throw error;
    }
  },

  checkoutBuyNow: async (accountId, productId, quantity) => {
    // Lấy thông tin sản phẩm
    const [productRows] = await pool.query(
      `
      SELECT
        p.ProductId,
        p.ProductName,
        p.Image,
        p.Price AS UnitPrice,
        s.StallId,
        s.AccountId AS SellerAccountId
      FROM Products p
      JOIN Stalls s ON s.StallId = p.StallId
      WHERE p.ProductId = ?
        AND p.IsActive = 1
      `,
      [productId]
    );

    if (productRows.length === 0) return [];

    const product = productRows[0];
    const totalPrice = product.UnitPrice * quantity;

    // Lấy voucher của account
    const [vouchers] = await pool.query(
      `
      SELECT 
        vu.UsageId,
        v.VoucherId,
        v.VoucherName,
        v.DiscountType,
        v.DiscountValue,
        v.MinOrderValue,
        v.MaxDiscount,
        v.EndTime,
        v.CreatedBy,
        s.StallId
      FROM VoucherUsage vu
      JOIN Vouchers v ON v.VoucherId = vu.VoucherId
      LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
      WHERE vu.AccountId = ?
        AND vu.IsUsed = 0
        AND v.EndTime >= CURDATE()
      `,
      [accountId]
    );

    // Lọc voucher cho sản phẩm này
    const itemVouchers = vouchers.filter(v => 
      v.DiscountType !== "ship" && // Voucher sản phẩm không bao gồm loại ship
      (v.CreatedBy === 1 || v.StallId === product.StallId)
    );

    return [{
      CartId: null,
      ProductId: product.ProductId,
      ProductName: product.ProductName,
      Image: product.Image,
      Quantity: quantity,
      UnitPrice: product.UnitPrice,
      totalPrice: totalPrice,
      StallId: product.StallId,
      SellerAccountId: product.SellerAccountId,
      vouchers: itemVouchers,
      selectedVoucher: null,
      selectedShipType: null
    }];
  },

  // Lấy voucher toàn đơn (chỉ của admin)
  getOrderVouchers: async (accountId) => {
    try {
      // Lấy voucher TOÀN ĐƠN của account (TẤT CẢ LOẠI: fixed, percent, ship)
      const [rows] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy,
          'order' as voucherType  -- Đánh dấu là voucher toàn đơn
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
          AND v.CreatedBy = 1  -- Chỉ voucher của Admin
        ORDER BY v.EndTime ASC
        `,
        [accountId]
      );
      return rows;
    } catch (error) {
      console.error("Error in getOrderVouchers:", error);
      throw error;
    }
  },

  // Lấy TẤT CẢ voucher (cả sản phẩm và toàn đơn) - để kiểm tra trùng lặp
  getAllVouchers: async (accountId) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT 
          vu.UsageId,
          v.VoucherId,
          v.VoucherName,
          v.DiscountType,
          v.DiscountValue,
          v.MinOrderValue,
          v.MaxDiscount,
          v.EndTime,
          v.CreatedBy,
          s.StallId,
          CASE 
            WHEN v.DiscountType = 'ship' THEN 'order'
            WHEN v.CreatedBy = 1 AND v.DiscountType IN ('fixed', 'percent') THEN 'both'  -- Có thể dùng cho cả 2
            ELSE 'product'
          END as voucherType
        FROM VoucherUsage vu
        JOIN Vouchers v ON v.VoucherId = vu.VoucherId
        LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
        WHERE vu.AccountId = ?
          AND vu.IsUsed = 0
          AND v.EndTime >= CURDATE()
        `,
        [accountId]
      );
      return rows;
    } catch (error) {
      console.error("Error in getAllVouchers:", error);
      throw error;
    }
  }
};

module.exports = Order;