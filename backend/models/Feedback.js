const { pool } = require("../config/db");

const Feedback = {
  /* ================= GET FEEDBACKS BY PRODUCT ID (ĐÃ SỬA) ================= */
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
        f.CreatedAt,
        a.Name AS AccountName,
        a.Avt AS AccountAvatar,
        GROUP_CONCAT(fi.ImageName) AS Images
      FROM Feedbacks f
      JOIN Accounts a ON f.AccountId = a.AccountId
      JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
      LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
      WHERE od.ProductId = ?
      GROUP BY f.FeedbackId
      ORDER BY f.CreatedAt DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log("SQL Query:", sql);
    console.log("Parameters:", [productId, limit, offset]);
    
    const [rows] = await pool.query(sql, [productId, limit, offset]);
    
    console.log("Rows returned:", rows.length);
    console.log("First row Images:", rows[0]?.Images);
    
    // Xử lý Images thành mảng
    const processedRows = rows.map(row => ({
      ...row,
      Images: row.Images ? row.Images.split(',') : []
    }));
    
    console.log("Processed first row Images:", processedRows[0]?.Images);
    
    return processedRows;
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

  /* ================= GET FEEDBACKS BY STALL ID (ĐÃ SỬA) ================= */
  getFeedbacksByStallId: async (stallId, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const sql = `
        SELECT 
          f.FeedbackId,
          f.AccountId,
          f.OrderDetailId,
          f.Score,
          f.Content,
          f.CreatedAt,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar,
          p.ProductId,
          p.ProductName,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        WHERE p.StallId = ?
        GROUP BY f.FeedbackId
        ORDER BY f.CreatedAt DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [stallId, limit, offset]);
      
      // Xử lý Images thành mảng
      const processedRows = rows.map(row => ({
        ...row,
        Images: row.Images ? row.Images.split(',') : []
      }));
      
      return processedRows;
    } catch (error) {
      console.error("Get feedbacks by stall ID error:", error);
      throw error;
    }
  },

  /* ================= CREATE FEEDBACK (ĐÃ SỬA CHO NHIỀU ẢNH) ================= */
  create: async (feedbackData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { AccountId, OrderDetailId, Score, Content, Images } = feedbackData;
      
      // Kiểm tra xem đã đánh giá chưa
      const checkSql = `
        SELECT FeedbackId FROM Feedbacks 
        WHERE AccountId = ? AND OrderDetailId = ?
      `;
      const [existing] = await connection.query(checkSql, [AccountId, OrderDetailId]);
      
      if (existing.length > 0) {
        throw new Error("Bạn đã đánh giá sản phẩm này rồi");
      }

      // Tạo feedback (KHÔNG có trường Image trong Feedbacks nữa)
      const sql = `
        INSERT INTO Feedbacks (AccountId, OrderDetailId, Score, Content, CreatedAt)
        VALUES (?, ?, ?, ?, NOW())
      `;
      const [result] = await connection.query(sql, [
        AccountId, 
        OrderDetailId, 
        Score || 5,  // Mặc định 5 sao nếu không có
        Content
      ]);

      const feedbackId = result.insertId;

      // Lưu nhiều ảnh vào bảng FeedbackImages nếu có
      if (Images && Images.length > 0) {
        const imageValues = Images.map(image => [
          feedbackId,
          image.filename
        ]);
        
        const imageSql = `
          INSERT INTO FeedbackImages (FeedbackId, ImageName)
          VALUES ?
        `;
        await connection.query(imageSql, [imageValues]);
      }

      await connection.commit();
      return feedbackId;
    } catch (error) {
      await connection.rollback();
      console.error("Create feedback error:", error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /* ================= GET FEEDBACK BY ID (ĐÃ SỬA) ================= */
  getFeedbackById: async (feedbackId) => {
    try {
      const sql = `
        SELECT 
          f.*,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar,
          p.ProductId,
          p.ProductName,
          od.OrderId,
          s.StallName,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        WHERE f.FeedbackId = ?
        GROUP BY f.FeedbackId
      `;
      const [rows] = await pool.query(sql, [feedbackId]);
      
      if (rows.length === 0) return null;
      
      const feedback = rows[0];
      // Phân tách Images thành mảng
      feedback.Images = feedback.Images ? feedback.Images.split(',') : [];
      
      return feedback;
    } catch (error) {
      console.error("Get feedback by ID error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACKS BY ACCOUNT ID (ĐÃ SỬA) ================= */
  getFeedbacksByAccountId: async (accountId, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit;
      const sql = `
        SELECT 
          f.FeedbackId,
          f.Score,
          f.Content,
          f.CreatedAt,
          od.OrderDetailId,
          p.ProductId,
          p.ProductName,
          p.Image AS ProductImage,
          s.StallId,
          s.StallName,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        WHERE f.AccountId = ?
        GROUP BY f.FeedbackId
        ORDER BY f.CreatedAt DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [accountId, limit, offset]);
      
      // Xử lý Images thành mảng
      const processedRows = rows.map(row => ({
        ...row,
        Images: row.Images ? row.Images.split(',') : []
      }));
      
      return processedRows;
    } catch (error) {
      console.error("Get feedbacks by account ID error:", error);
      throw error;
    }
  },

  /* ================= UPDATE FEEDBACK (ĐÃ SỬA) ================= */
  update: async (feedbackId, feedbackData) => {
    try {
      const { Score, Content } = feedbackData;
      const sql = `
        UPDATE Feedbacks 
        SET Score = ?, Content = ?
        WHERE FeedbackId = ?
      `;
      const [result] = await pool.query(sql, [
        Score, 
        Content, 
        feedbackId
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Update feedback error:", error);
      throw error;
    }
  },

  /* ================= DELETE FEEDBACK (ĐÃ SỬA) ================= */
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

      // Xóa feedback (cascade sẽ xóa ảnh trong FeedbackImages)
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

  /* ================= GET FEEDBACKS WITH DETAILS (ĐÃ SỬA) ================= */
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
          f.CreatedAt,
          a.Name AS AccountName,
          a.Avt AS AccountAvatar,
          od.OrderDetailId,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        WHERE od.ProductId = ?
          AND f.Score >= ? AND f.Score <= ?
        GROUP BY f.FeedbackId
      `;
      
      const params = [productId, minScore, maxScore];
      
      // Thêm sắp xếp
      sql += " ORDER BY f.CreatedAt DESC";
      
      // Thêm phân trang
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
      
      const [rows] = await pool.query(sql, params);
      
      // Xử lý Images thành mảng
      const processedRows = rows.map(row => ({
        ...row,
        Images: row.Images ? row.Images.split(',') : []
      }));
      
      return processedRows;
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
          5: total > 0 ? Math.round((result.fiveStar / total) * 100) : 0,
          4: total > 0 ? Math.round((result.fourStar / total) * 100) : 0,
          3: total > 0 ? Math.round((result.threeStar / total) * 100) : 0,
          2: total > 0 ? Math.round((result.twoStar / total) * 100) : 0,
          1: total > 0 ? Math.round((result.oneStar / total) * 100) : 0
        }
      };
    } catch (error) {
      console.error("Get feedback statistics error:", error);
      throw error;
    }
  },

  /* ================= GET RECENT FEEDBACKS (ĐÃ SỬA) ================= */
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
          s.StallName,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN Accounts a ON f.AccountId = a.AccountId
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        GROUP BY f.FeedbackId
        ORDER BY f.CreatedAt DESC
        LIMIT ?
      `;
      const [rows] = await pool.query(sql, [limit]);
      
      // Xử lý Images thành mảng
      const processedRows = rows.map(row => ({
        ...row,
        Images: row.Images ? row.Images.split(',') : []
      }));
      
      return processedRows;
    } catch (error) {
      console.error("Get recent feedbacks error:", error);
      throw error;
    }
  },

  /* ================= CHECK ORDER OWNERSHIP ================= */
  checkOrderOwnership: async (orderId, accountId) => {
    try {
      const [rows] = await pool.query(
        "SELECT OrderId FROM Orders WHERE OrderId = ? AND AccountId = ?",
        [orderId, accountId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Check order ownership error:", error);
      throw error;
    }
  },

  /* ================= GET ORDER PRODUCTS FOR FEEDBACK ================= */
  getOrderProductsForFeedback: async (orderId, accountId) => {
    try {
      const sql = `
        SELECT 
          od.OrderDetailId,
          od.OrderId,
          od.ProductId,
          od.Quantity,
          od.UnitPrice,
          od.Status as OrderDetailStatus,
          p.ProductName,
          p.Image as ProductImage,
          s.StallId,
          s.StallName,
          f.FeedbackId
        FROM OrderDetails od
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        LEFT JOIN Feedbacks f ON od.OrderDetailId = f.OrderDetailId AND f.AccountId = ?
        WHERE od.OrderId = ?
        ORDER BY od.OrderDetailId
      `;
      const [rows] = await pool.query(sql, [accountId, orderId]);
      return rows;
    } catch (error) {
      console.error("Get order products for feedback error:", error);
      throw error;
    }
  },

  /* ================= VALIDATE ORDER DETAIL FOR FEEDBACK ================= */
  validateOrderDetailForFeedback: async (orderDetailId, accountId) => {
    try {
      const sql = `
        SELECT od.OrderDetailId, od.Status, p.ProductName 
        FROM OrderDetails od
        JOIN Orders o ON od.OrderId = o.OrderId
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE od.OrderDetailId = ? AND o.AccountId = ?
      `;
      const [rows] = await pool.query(sql, [orderDetailId, accountId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Validate order detail for feedback error:", error);
      throw error;
    }
  },

  /* ================= CHECK EXISTING FEEDBACK ================= */
  checkExistingFeedback: async (orderDetailId, accountId) => {
    try {
      const [rows] = await pool.query(
        "SELECT FeedbackId FROM Feedbacks WHERE OrderDetailId = ? AND AccountId = ?",
        [orderDetailId, accountId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Check existing feedback error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACK BY ORDER DETAIL ================= */
  getFeedbackByOrderDetail: async (orderDetailId, accountId) => {
    try {
      const [rows] = await pool.query(
        "SELECT FeedbackId FROM Feedbacks WHERE OrderDetailId = ? AND AccountId = ?",
        [orderDetailId, accountId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Get feedback by order detail error:", error);
      throw error;
    }
  },

  /* ================= GET FEEDBACKS WITH PAGINATION ================= */
  getFeedbacksWithPagination: async (accountId, filters) => {
    try {
      let sql = `
        SELECT 
          f.FeedbackId,
          f.Score,
          f.Content,
          f.CreatedAt,
          od.OrderDetailId,
          p.ProductId,
          p.ProductName,
          p.Image AS ProductImage,
          s.StallId,
          s.StallName,
          GROUP_CONCAT(fi.ImageName) AS Images
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        JOIN Stalls s ON p.StallId = s.StallId
        LEFT JOIN FeedbackImages fi ON f.FeedbackId = fi.FeedbackId
        WHERE f.AccountId = ?
      `;
      
      const params = [accountId];
      
      // Apply filters
      if (filters.score) {
        sql += " AND f.Score = ?";
        params.push(filters.score);
      }
      
      if (filters.dateFrom) {
        sql += " AND DATE(f.CreatedAt) >= ?";
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        sql += " AND DATE(f.CreatedAt) <= ?";
        params.push(filters.dateTo);
      }
      
      sql += " GROUP BY f.FeedbackId";
      sql += " ORDER BY f.CreatedAt DESC";
      
      // Count total
      const countSql = sql.replace(/SELECT.*FROM/, "SELECT COUNT(DISTINCT f.FeedbackId) as total FROM");
      const countSqlWithoutGroup = countSql.replace(/GROUP BY.*/, "");
      const [countRows] = await pool.query(countSqlWithoutGroup, params);
      const total = countRows[0].total;
      
      // Apply pagination
      sql += " LIMIT ? OFFSET ?";
      params.push(filters.limit, (filters.page - 1) * filters.limit);
      
      const [rows] = await pool.query(sql, params);
      
      // Xử lý Images thành mảng
      const processedRows = rows.map(row => ({
        ...row,
        Images: row.Images ? row.Images.split(',') : []
      }));
      
      return {
        feedbacks: processedRows,
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      console.error("Get feedbacks with pagination error:", error);
      throw error;
    }
  },

  /* ================= GET USER FEEDBACK STATS ================= */
  getUserFeedbackStats: async (accountId) => {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          AVG(Score) as average,
          SUM(CASE WHEN Score = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN Score = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN Score = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN Score = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN Score = 1 THEN 1 ELSE 0 END) as one_star
        FROM Feedbacks
        WHERE AccountId = ?
      `;
      const [rows] = await pool.query(sql, [accountId]);
      return rows[0];
    } catch (error) {
      console.error("Get user feedback stats error:", error);
      throw error;
    }
  },

  /* ================= CHECK FEEDBACK OWNERSHIP ================= */
  checkFeedbackOwnership: async (feedbackId, accountId) => {
    try {
      const [rows] = await pool.query(
        "SELECT AccountId FROM Feedbacks WHERE FeedbackId = ?",
        [feedbackId]
      );
      return rows.length > 0 && rows[0].AccountId === accountId;
    } catch (error) {
      console.error("Check feedback ownership error:", error);
      throw error;
    }
  },

  /* ================= GET STALL AVERAGE RATING ================= */
  getStallAverageRating: async (stallId) => {
    try {
      const sql = `
        SELECT 
          IFNULL(AVG(f.Score), 0) as avgScore,
          COUNT(f.FeedbackId) as totalFeedbacks
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE p.StallId = ?
      `;
      const [rows] = await pool.query(sql, [stallId]);
      return {
        avgScore: parseFloat(rows[0]?.avgScore) || 0,
        totalFeedbacks: parseInt(rows[0]?.totalFeedbacks) || 0
      };
    } catch (error) {
      console.error("Get stall average rating error:", error);
      throw error;
    }
  },

  /* ================= GET STALL FEEDBACK STATISTICS ================= */
  getStallFeedbackStatistics: async (stallId) => {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          AVG(f.Score) as average,
          SUM(CASE WHEN f.Score = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN f.Score = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN f.Score = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN f.Score = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN f.Score = 1 THEN 1 ELSE 0 END) as one_star
        FROM Feedbacks f
        JOIN OrderDetails od ON f.OrderDetailId = od.OrderDetailId
        JOIN Products p ON od.ProductId = p.ProductId
        WHERE p.StallId = ?
      `;
      const [rows] = await pool.query(sql, [stallId]);
      return rows[0];
    } catch (error) {
      console.error("Get stall feedback statistics error:", error);
      throw error;
    }
  }
};

module.exports = Feedback;