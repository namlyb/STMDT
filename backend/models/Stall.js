const { pool } = require("../config/db");

const Stall = {
  getByProductId: async (productId) => {
    const sql = `
      SELECT 
        s.StallId,
        s.StallName,
        a.AccountId,
        a.Avt
      FROM Products p
      JOIN Stalls s ON p.StallId = s.StallId
      JOIN Accounts a ON s.AccountId = a.AccountId
      WHERE p.ProductId = ?
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows[0];
  }
};

module.exports = Stall;
