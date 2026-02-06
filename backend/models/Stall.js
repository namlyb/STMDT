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
  },

  getByAccountId: async (accountId) => {
    const sql = `
      SELECT StallId, StallName, AccountId
      FROM Stalls
      WHERE AccountId = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [accountId]);
    return rows[0];
  },

  // Tạo Stall mới (nếu seller chưa có gian hàng)
  create: async ({ StallName, AccountId }) => {
    const sql = `INSERT INTO Stalls (StallName, AccountId) VALUES (?, ?)`;
    const [result] = await pool.query(sql, [StallName, AccountId]);
    return { StallId: result.insertId, StallName, AccountId };
  },

  getByStallId: async (stallId) => {
  const sql = `
    SELECT 
      s.StallId,
      s.StallName,
      a.AccountId,
      a.Name,
      a.Avt
    FROM Stalls s
    JOIN Accounts a ON s.AccountId = a.AccountId
    WHERE s.StallId = ?
  `;
  const [rows] = await pool.query(sql, [stallId]);
  return rows[0];
},


};

module.exports = Stall;
