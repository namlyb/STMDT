const { pool } = require("../config/db");

const Feedback = {
  getByProductId: async (productId) => {
    const sql = `
      SELECT 
        f.FeedbackId,
        f.Score,
        f.Content,
        f.CreatedAt,
        a.Name,
        a.Avt
      FROM Feedbacks f
      JOIN Accounts a ON f.AccountId = a.AccountId
      JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
      WHERE od.ProductId = ?
      ORDER BY f.CreatedAt DESC
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows;
  },

  getAvgScoreByProductId: async (productId) => {
    const sql = `
      SELECT AVG(f.Score) AS avgScore
      FROM Feedbacks f
      JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
      WHERE od.ProductId = ?
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows[0]?.avgScore || 0;
  }
};

module.exports = Feedback;
