const { pool } = require("../config/db");

const OrderDetail = {
  countByProductId: async (productId) => {
    const sql = `
      SELECT COUNT(*) AS totalOrders
      FROM OrderDetails
      WHERE ProductId = ?
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows[0].totalOrders;
  },

  create: async (orderDetailData) => {
    const {
      OrderId,
      ProductId,
      UsageId,
      UnitPrice,
      Quantity,
      ShipTypeId,
      ShipFee,
      FeeId
    } = orderDetailData;

    const [result] = await pool.query(
      `INSERT INTO OrderDetails (OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId, Status, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [OrderId, ProductId, UsageId, UnitPrice, Quantity, ShipTypeId, ShipFee, FeeId]
    );

    return result.insertId;
  }
};

module.exports = OrderDetail;
