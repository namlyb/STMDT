const { pool } = require("../config/db");

const Feedback = {
  /* ================= GET FEEDBACKS BY PRODUCT ID ================= */
  getFeedbacksByProductId: async (productId, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const sql = `
        SELECT 
          f.FeedbackId,
          f.AccountId,
          f.OrderDetailId,
          f.Score,
          f.Content,
          f.Image,
          f.CreatedAt,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        WHERE od.ProductId = ?
        ORDER BY f.CreatedAt DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [productId, limit, offset]);
      return rows;
    } catch (error) {
      console.error("Get feedbacks by product ID error:", error);
      throw error;
    }
  },

  /* ================= GET PRODUCT AVERAGE RATING ================= */
  getProductAverageRating: async (productId) => {
    try {
      const sql = `
        SELECT 
          IFNULL(AVG(f.Score), 0) as avgScore,
          COUNT(f.FeedbackId) as totalReviews
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        WHERE od.ProductId = ?
      `;
      const [rows] = await pool.query(sql, [productId]);
      
      // Đảm bảo trả về giá trị số
      const result = rows[0] || {};
      return {
        avgScore: parseFloat(result.avgScore) || 0,
        totalReviews: parseInt(result.totalReviews) || 0
      };
    } catch (error) {
      console.error("Get product average rating error:", error);
      return { avgScore: 0, totalReviews: 0 };
    }
  },

  /* ================= GET FEEDBACKS BY STALL ID ================= */
  getByStallId: async (stallId) => {
    try {
      const sql = `
        SELECT 
          f.FeedbackId,
          f.AccountId,
          f.OrderDetailId,
          f.Score,
          f.Content,
          f.Image,
          f.CreatedAt,
          a.Name AS AccountName,
          p.ProductId,
          p.ProductName
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE p.StallId = ?
        ORDER BY f.CreatedAt DESC
      `;
      const [rows] = await pool.query(sql, [stallId]);
      return rows;
    } catch (error) {
      console.error("Get feedbacks by stall ID error:", error);
      throw error;
    }
  },

  /* ================= CREATE FEEDBACK ================= */
  create: async (feedbackData) => {
    try {
      const { AccountId, OrderDetailId, Score, Content, Image } = feedbackData;
      
      // Kiểm tra xem đã đánh giá chưa
      const checkSql = `
        SELECT FeedbackId FROM Feedbacks 
        WHERE AccountId = ? AND OrderDetailId = ?
      `;
      const [existing] = await pool.query(checkSql, [AccountId, OrderDetailId]);
      
      if (existing.length > 0) {
        throw new Error("Bạn đã đánh giá sản phẩm này rồi");
      }

      const sql = `
        INSERT INTO Feedbacks (AccountId, OrderDetailId, Score, Content, Image, CreatedAt)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      const [result] = await pool.query(sql, [
        AccountId, 
        OrderDetailId, 
        Score, 
        Content, 
        Image || null
      ]);
      return result.insertId;
    } catch (error) {
      console.error("Create feedback error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACK BY ID ================= */
  getById: async (feedbackId) => {
    try {
      const sql = `
        SELECT 
          f.*,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar,
          p.ProductId,
          p.ProductName,
          od.OrderId
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE f.FeedbackId = ?
      `;
      const [rows] = await pool.query(sql, [feedbackId]);
      return rows[0];
    } catch (error) {
      console.error("Get feedback by ID error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACKS BY ACCOUNT ID ================= */
  getByAccountId: async (accountId, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const sql = `
        SELECT 
          f.FeedbackId,
          f.Score,
          f.Content,
          f.Image,
          f.CreatedAt,
          od.OrderDetailId,
          p.ProductId,
          p.ProductName,
          p.Image AS ProductImage,
          s.StallId,
          s.StallName
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        WHERE f.AccountId = ?
        ORDER BY f.CreatedAt DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [accountId, limit, offset]);
      return rows;
    } catch (error) {
      console.error("Get feedbacks by account ID error:", error);
      throw error;
    }
  },

  /* ================= UPDATE FEEDBACK ================= */
  update: async (feedbackId, feedbackData) => {
    try {
      const { Score, Content, Image } = feedbackData;
      const sql = `
        UPDATE Feedbacks 
        SET Score = ?, Content = ?, Image = ?
        WHERE FeedbackId = ?
      `;
      const [result] = await pool.query(sql, [
        Score, 
        Content, 
        Image || null, 
        feedbackId
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Update feedback error:", error);
      throw error;
    }
  },

  /* ================= DELETE FEEDBACK ================= */
  delete: async (feedbackId, accountId) => {
    try {
      // Kiểm tra quyền sở hữu
      const checkSql = `SELECT AccountId FROM Feedbacks WHERE FeedbackId = ?`;
      const [rows] = await pool.query(checkSql, [feedbackId]);
      
      if (rows.length === 0) {
        throw new Error("Feedback không tồn tại");
      }
      
      if (rows[0].AccountId !== accountId) {
        throw new Error("Bạn không có quyền xóa feedback này");
      }

      const sql = `DELETE FROM Feedbacks WHERE FeedbackId = ?`;
      const [result] = await pool.query(sql, [feedbackId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Delete feedback error:", error);
      throw error;
    }
  },

  /* ================= CHECK IF USER CAN REVIEW ================= */
  canReview: async (accountId, orderDetailId) => {
    try {
      // Kiểm tra xem đã đánh giá chưa
      const checkFeedbackSql = `
        SELECT FeedbackId FROM Feedbacks 
        WHERE AccountId = ? AND OrderDetailId = ?
      `;
      const [existing] = await pool.query(checkFeedbackSql, [accountId, orderDetailId]);
      
      if (existing.length > 0) {
        return { canReview: false, reason: "Đã đánh giá" };
      }

      // Kiểm tra xem đơn hàng đã hoàn thành chưa
      const checkOrderSql = `
        SELECT od.Status 
        FROM OrderDetails od
        WHERE od.OrderDetailId = ?
      `;
      const [orderDetail] = await pool.query(checkOrderSql, [orderDetailId]);
      
      if (orderDetail.length === 0) {
        return { canReview: false, reason: "Đơn hàng không tồn tại" };
      }

      // Chỉ có thể đánh giá khi đơn hàng đã hoàn thành (status = 4)
      if (orderDetail[0].Status !== 4) {
        return { canReview: false, reason: "Chỉ có thể đánh giá đơn hàng đã hoàn thành" };
      }

      return { canReview: true };
    } catch (error) {
      console.error("Check can review error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACKS WITH DETAILS ================= */
  getFeedbacksWithDetails: async (productId, options = {}) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        minScore = 0, 
        maxScore = 5 
      } = options;
      
      const offset = (page - 1) * limit;
      
      let sql = `
        SELECT 
          f.FeedbackId,
          f.AccountId,
          f.Score,
          f.Content,
          f.Image AS FeedbackImage,
          f.CreatedAt,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar,
          od.OrderDetailId
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        WHERE od.ProductId = ?
          AND f.Score >= ? AND f.Score <= ?
      `;
      
      const params = [productId, minScore, maxScore];
      
      // Thêm sắp xếp
      sql += " ORDER BY f.CreatedAt DESC";
      
      // Thêm phân trang
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
      
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Get feedbacks with details error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACK STATISTICS ================= */
  getFeedbackStatistics: async (productId) => {
    try {
      const sql = `
        SELECT 
          COUNT(*) as totalFeedbacks,
          AVG(Score) as averageScore,
          SUM(CASE WHEN Score = 5 THEN 1 ELSE 0 END) as fiveStar,
          SUM(CASE WHEN Score = 4 THEN 1 ELSE 0 END) as fourStar,
          SUM(CASE WHEN Score = 3 THEN 1 ELSE 0 END) as threeStar,
          SUM(CASE WHEN Score = 2 THEN 1 ELSE 0 END) as twoStar,
          SUM(CASE WHEN Score = 1 THEN 1 ELSE 0 END) as oneStar
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        WHERE od.ProductId = ?
      `;
      const [rows] = await pool.query(sql, [productId]);
      
      const result = rows[0] || {};
      const total = result.totalFeedbacks || 0;
      
      return {
        totalFeedbacks: total,
        averageScore: parseFloat(result.averageScore) || 0,
        distribution: {
          fiveStar: total > 0 ? Math.round((result.fiveStar / total) * 100) : 0,
          fourStar: total > 0 ? Math.round((result.fourStar / total) * 100) : 0,
          threeStar: total > 0 ? Math.round((result.threeStar / total) * 100) : 0,
          twoStar: total > 0 ? Math.round((result.twoStar / total) * 100) : 0,
          oneStar: total > 0 ? Math.round((result.oneStar / total) * 100) : 0
        }
      };
    } catch (error) {
      console.error("Get feedback statistics error:", error);
      throw error;
    }
  },

  /* ================= GET RECENT FEEDBACKS ================= */
  getRecentFeedbacks: async (limit = 5) => {
    try {
      const sql = `
        SELECT 
          f.FeedbackId,
          f.Score,
          f.Content,
          f.CreatedAt,
          a.Name AS AccountName,
          p.ProductName,
          s.StallName
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        ORDER BY f.CreatedAt DESC
        LIMIT ?
      `;
      const [rows] = await pool.query(sql, [limit]);
      return rows;
    } catch (error) {
      console.error("Get recent feedbacks error:", error);
      throw error;
    }
  }
};

module.exports = Feedback;