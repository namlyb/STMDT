const {pool} = require("../config/db");

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
    const placeholders = cartIds.map(() => "?").join(",");
    const params = [accountId, accountId, ...cartIds];
  const [rows] = await pool.query(
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
      s.AccountId AS SellerAccountId,

      vu.UsageId,
      v.VoucherId,
      v.VoucherName,
      v.DiscountType,
      v.Discount,
      v.ConditionText,
      v.EndTime

    FROM Carts c
    JOIN Products p ON p.ProductId = c.ProductId
    JOIN Stalls s ON s.StallId = p.StallId

    LEFT JOIN VoucherUsage vu 
      ON vu.AccountId = ?
      AND vu.IsUsed = 0

    LEFT JOIN Vouchers v 
      ON v.VoucherId = vu.VoucherId
      AND v.CreatedBy = s.AccountId
      AND v.EndTime >= CURDATE()

    WHERE c.AccountId = ?
      AND c.CartId IN (${placeholders})
      AND c.Status = 1
    `,
    params
  );

  return rows;
  },

};

module.exports = Order;
