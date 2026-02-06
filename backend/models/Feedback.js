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
  },

  getByStallId: async (stallId) => {
    const sql = `
      SELECT 
        f.FeedbackId,
        f.Score,
        f.Content,
        f.Image,
        f.CreatedAt,
        a.Name AS CustomerName,
        a.Avt AS CustomerAvt,
        p.ProductName,
        od.OrderDetailId
      FROM Feedbacks f
      JOIN Accounts a ON f.AccountId = a.AccountId
      JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
      JOIN Products p ON od.ProductId = p.ProductId
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE s.StallId = ?
      ORDER BY f.CreatedAt DESC
      LIMIT 20
    `;
    const [rows] = await pool.query(sql, [stallId]);
    return rows;
  },

  getAvgScoreByStallId: async (stallId) => {
    const sql = `
      SELECT 
        AVG(f.Score) AS avgScore,
        COUNT(f.FeedbackId) AS totalFeedbacks
      FROM Feedbacks f
      JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
      JOIN Products p ON od.ProductId = p.ProductId
      WHERE p.StallId = ?
    `;
    const [rows] = await pool.query(sql, [stallId]);
    return rows[0] || { avgScore: 0, totalFeedbacks: 0 };
  },
};

module.exports = Feedback;
