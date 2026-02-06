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

  // Lấy feedback theo order detail
getFeedbackByOrderDetail: async (orderDetailId) => {
  const [rows] = await pool.query(
    `SELECT f.* 
     FROM Feedbacks f
     WHERE f.OrderDetailId = ?`,
    [orderDetailId]
  );
  
  return rows[0] || null;
},

// Lấy order details có thể feedback của user
getFeedbackEligibleOrderDetails: async (accountId, orderId = null) => {
  let query = `
    SELECT 
      od.OrderDetailId,
      od.OrderId,
      p.ProductId,
      p.ProductName,
      p.Image as ProductImage,
      od.Quantity,
      od.UnitPrice,
      s.StallName,
      od.Status
    FROM OrderDetails od
    JOIN Orders o ON od.OrderId = o.OrderId
    JOIN Products p ON od.ProductId = p.ProductId
    JOIN Stalls s ON p.StallId = s.StallId
    LEFT JOIN Feedbacks f ON od.OrderDetailId = f.OrderDetailId
    WHERE o.AccountId = ?
      AND od.Status = 4
      AND f.FeedbackId IS NULL
  `;
  
  const params = [accountId];
  
  if (orderId) {
    query += " AND od.OrderId = ?";
    params.push(orderId);
  }
  
  query += " ORDER BY o.OrderDate DESC";
  
  const [rows] = await pool.query(query, params);
  return rows;
},

// Lấy tổng số feedback theo điều kiện
countFeedbacks: async (conditions = {}) => {
  let query = "SELECT COUNT(*) as total FROM Feedbacks";
  const params = [];
  
  const conditionClauses = [];
  
  if (conditions.accountId) {
    conditionClauses.push("AccountId = ?");
    params.push(conditions.accountId);
  }
  
  if (conditions.stallId) {
    conditionClauses.push(`
      OrderDetailId IN (
        SELECT od.OrderDetailId 
        FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE p.StallId = ?
      )
    `);
    params.push(conditions.stallId);
  }
  
  if (conditions.productId) {
    conditionClauses.push(`
      OrderDetailId IN (
        SELECT OrderDetailId 
        FROM OrderDetails 
        WHERE ProductId = ?
      )
    `);
    params.push(conditions.productId);
  }
  
  if (conditions.score) {
    conditionClauses.push("Score = ?");
    params.push(conditions.score);
  }
  
  if (conditions.dateFrom) {
    conditionClauses.push("DATE(CreatedAt) >= ?");
    params.push(conditions.dateFrom);
  }
  
  if (conditions.dateTo) {
    conditionClauses.push("DATE(CreatedAt) <= ?");
    params.push(conditions.dateTo);
  }
  
  if (conditionClauses.length > 0) {
    query += " WHERE " + conditionClauses.join(" AND ");
  }
  
  const [rows] = await pool.query(query, params);
  return rows[0]?.total || 0;
},
};

module.exports = Feedback;
