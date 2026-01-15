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
  }
};

module.exports = OrderDetail;
