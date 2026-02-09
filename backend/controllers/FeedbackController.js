const FeedbackModel = require("../models/Feedback");

const FeedbackController = {
  // ==================== BUYER CONTROLLERS ====================
  
  // Tạo feedback
  createFeedback: async (req, res) => {
    try {
      const { OrderDetailId, Score, Content } = req.body;
      const AccountId = req.user.AccountId;
      const Image = req.file ? `/uploads/feedback/${req.file.filename}` : null;

      // Validation
      if (!OrderDetailId || !Score || !Content) {
        return res.status(400).json({ 
          message: "Vui lòng điền đầy đủ thông tin đánh giá" 
        });
      }

      if (Score < 1 || Score > 5) {
        return res.status(400).json({ 
          message: "Điểm đánh giá phải từ 1 đến 5 sao" 
        });
      }

      if (Content.length < 10 || Content.length > 500) {
        return res.status(400).json({ 
          message: "Nội dung đánh giá phải từ 10 đến 500 ký tự" 
        });
      }

      // Kiểm tra order detail có hợp lệ không
      const orderDetail = await FeedbackModel.validateOrderDetailForFeedback(OrderDetailId, AccountId);
      if (!orderDetail) {
        return res.status(404).json({ 
          message: "Không tìm thấy sản phẩm hoặc sản phẩm chưa được giao thành công" 
        });
      }

      // Kiểm tra đã feedback chưa
      const hasExistingFeedback = await FeedbackModel.checkExistingFeedback(OrderDetailId);
      if (hasExistingFeedback) {
        return res.status(400).json({ 
          message: "Bạn đã đánh giá sản phẩm này trước đó" 
        });
      }

      // Tạo feedback
      const feedbackData = {
        AccountId,
        OrderDetailId,
        Score,
        Content,
        Image
      };

      const feedbackId = await FeedbackModel.createFeedback(feedbackData);

      res.status(201).json({ 
        message: "Đánh giá thành công",
        feedbackId,
        productName: orderDetail.ProductName
      });

    } catch (error) {
      console.error("Create feedback error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi tạo đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy danh sách feedback của user
  getMyFeedbacks: async (req, res) => {
    try {
      const AccountId = req.user.AccountId;
      
      const filters = {
        score: req.query.score || null,
        dateFrom: req.query.dateFrom || null,
        dateTo: req.query.dateTo || null,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      // Validate pagination
      if (filters.page < 1) filters.page = 1;
      if (filters.limit < 1 || filters.limit > 100) filters.limit = 10;

      // Lấy feedbacks với phân trang
      const result = await FeedbackModel.getFeedbacksWithPagination(AccountId, filters);
      
      // Lấy thống kê
      const stats = await FeedbackModel.getUserFeedbackStats(AccountId);

      res.json({
        feedbacks: result.feedbacks,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        stats: {
          total: stats.total,
          average: Number(stats.average).toFixed(1),
          distribution: {
            5: stats.five_star,
            4: stats.four_star,
            3: stats.three_star,
            2: stats.two_star,
            1: stats.one_star
          }
        }
      });

    } catch (error) {
      console.error("Get my feedbacks error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi lấy danh sách đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Cập nhật feedback
  updateFeedback: async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const { score, content } = req.body;
      const AccountId = req.user.AccountId;

      // Validation
      if (!score && !content) {
        return res.status(400).json({ 
          message: "Không có thông tin nào để cập nhật" 
        });
      }

      if (score && (score < 1 || score > 5)) {
        return res.status(400).json({ 
          message: "Điểm đánh giá phải từ 1 đến 5 sao" 
        });
      }

      if (content && (content.length < 10 || content.length > 500)) {
        return res.status(400).json({ 
          message: "Nội dung đánh giá phải từ 10 đến 500 ký tự" 
        });
      }

      // Kiểm tra quyền sở hữu
      const hasPermission = await FeedbackModel.checkFeedbackOwnership(feedbackId, AccountId);
      if (!hasPermission) {
        return res.status(403).json({ 
          message: "Bạn không có quyền chỉnh sửa đánh giá này" 
        });
      }

      // Cập nhật feedback
      const updateData = {};
      if (score) updateData.Score = score;
      if (content) updateData.Content = content;

      const isUpdated = await FeedbackModel.updateFeedback(feedbackId, updateData);
      
      if (!isUpdated) {
        return res.status(404).json({ 
          message: "Không tìm thấy đánh giá để cập nhật" 
        });
      }

      res.json({ 
        message: "Cập nhật đánh giá thành công",
        feedbackId 
      });

    } catch (error) {
      console.error("Update feedback error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi cập nhật đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Xóa feedback
  deleteFeedback: async (req, res) => {
    try {
      const { feedbackId } = req.params;
      const AccountId = req.user.AccountId;

      // Kiểm tra quyền sở hữu
      const hasPermission = await FeedbackModel.checkFeedbackOwnership(feedbackId, AccountId);
      if (!hasPermission) {
        return res.status(403).json({ 
          message: "Bạn không có quyền xóa đánh giá này" 
        });
      }

      // Xóa feedback
      const isDeleted = await FeedbackModel.deleteFeedback(feedbackId);
      
      if (!isDeleted) {
        return res.status(404).json({ 
          message: "Không tìm thấy đánh giá để xóa" 
        });
      }

      res.json({ 
        message: "Xóa đánh giá thành công",
        feedbackId 
      });

    } catch (error) {
      console.error("Delete feedback error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi xóa đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ==================== PUBLIC CONTROLLERS ====================
  
  // Lấy feedback theo sản phẩm
  getProductFeedbacks: async (req, res) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Validate pagination
      if (page < 1) page = 1;
      if (limit < 1 || limit > 50) limit = 10;

      // Lấy feedbacks và rating
      const [feedbacks, rating] = await Promise.all([
        FeedbackModel.getFeedbacksByProductId(productId, page, limit),
        FeedbackModel.getProductAverageRating(productId)
      ]);

      res.json({
        feedbacks,
        rating: {
          average: Number(rating.avgScore).toFixed(1),
          total: rating.totalReviews
        },
        pagination: {
          page,
          limit,
          total: rating.totalReviews,
          totalPages: Math.ceil(rating.totalReviews / limit)
        }
      });

    } catch (error) {
      console.error("Get product feedbacks error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi lấy đánh giá sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy feedback theo stall
  getStallFeedbacks: async (req, res) => {
    try {
      const { stallId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Validate pagination
      if (page < 1) page = 1;
      if (limit < 1 || limit > 50) limit = 10;

      // Lấy feedbacks và rating
      const [feedbacks, rating] = await Promise.all([
        FeedbackModel.getFeedbacksByStallId(stallId, page, limit),
        FeedbackModel.getStallAverageRating(stallId)
      ]);

      res.json({
        feedbacks,
        rating: {
          average: Number(rating.avgScore).toFixed(1),
          total: rating.totalFeedbacks
        },
        pagination: {
          page,
          limit,
          total: rating.totalFeedbacks,
          totalPages: Math.ceil(rating.totalFeedbacks / limit)
        }
      });

    } catch (error) {
      console.error("Get stall feedbacks error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi lấy đánh giá gian hàng",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy chi tiết feedback
  getFeedbackDetail: async (req, res) => {
    try {
      const { feedbackId } = req.params;

      const feedback = await FeedbackModel.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ 
          message: "Không tìm thấy đánh giá" 
        });
      }

      res.json(feedback);

    } catch (error) {
      console.error("Get feedback detail error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi lấy chi tiết đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Kiểm tra có thể feedback sản phẩm không
  checkFeedbackEligibility: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const AccountId = req.user.AccountId;

      const orderDetail = await FeedbackModel.validateOrderDetailForFeedback(orderDetailId, AccountId);
      if (!orderDetail) {
        return res.status(404).json({ 
          eligible: false,
          message: "Không tìm thấy sản phẩm hoặc sản phẩm chưa được giao thành công" 
        });
      }

      // Kiểm tra đã feedback chưa
      const hasExistingFeedback = await FeedbackModel.checkExistingFeedback(orderDetailId);
      
      res.json({
        eligible: !hasExistingFeedback,
        productName: orderDetail.ProductName,
        hasExistingFeedback,
        existingFeedbackId: hasExistingFeedback ? (await FeedbackModel.getFeedbackByOrderDetail(orderDetailId))?.FeedbackId : null
      });

    } catch (error) {
      console.error("Check feedback eligibility error:", error);
      res.status(500).json({ 
        message: "Đã xảy ra lỗi khi kiểm tra điều kiện đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy danh sách sản phẩm trong đơn hàng để feedback
  getOrderProductsForFeedback: async (req, res) => {
    try {
      const { orderId } = req.params;
      const AccountId = req.user.AccountId;
      
      // Kiểm tra đơn hàng có thuộc về user không
      const { pool } = require("../config/db");
      const [orderRows] = await pool.query(
        "SELECT OrderId FROM Orders WHERE OrderId = ? AND AccountId = ?",
        [orderId, AccountId]
      );
      
      if (orderRows.length === 0) {
        return res.status(403).json({
          message: "Bạn không có quyền truy cập đơn hàng này"
        });
      }
      
      // Lấy danh sách sản phẩm
      const products = await FeedbackModel.getOrderProductsForFeedback(orderId, AccountId);
      
      // Format image URLs
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const formattedProducts = products.map(product => ({
        ...product,
        ProductImage: product.ProductImage 
          ? (product.ProductImage.startsWith('http')
              ? product.ProductImage
              : `${baseUrl}/uploads/ProductImage/${product.ProductImage}`)
          : null,
        canFeedback: !product.FeedbackId, // Có thể feedback nếu chưa có FeedbackId
        hasFeedback: !!product.FeedbackId // Đã feedback nếu có FeedbackId
      }));
      
      res.json({
        orderId,
        products: formattedProducts,
        total: formattedProducts.length,
        canFeedbackCount: formattedProducts.filter(p => p.canFeedback).length,
        hasFeedbackCount: formattedProducts.filter(p => p.hasFeedback).length
      });
      
    } catch (error) {
      console.error("Get order products for feedback error:", error);
      res.status(500).json({
        message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy chi tiết sản phẩm để feedback (cho modal)
  getProductFeedbackDetail: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const AccountId = req.user.AccountId;
      
      // Kiểm tra sản phẩm có thể feedback không
      const product = await FeedbackModel.validateOrderDetailForFeedback(orderDetailId, AccountId);
      if (!product) {
        return res.status(404).json({
          message: "Sản phẩm không tồn tại hoặc đã được đánh giá"
        });
      }
      
      // Kiểm tra đã feedback chưa
      const hasFeedback = await FeedbackModel.checkExistingFeedback(orderDetailId);
      
      res.json({
        product: {
          ...product,
          canFeedback: !hasFeedback
        }
      });
      
    } catch (error) {
      console.error("Get product feedback detail error:", error);
      res.status(500).json({
        message: "Đã xảy ra lỗi khi lấy thông tin sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = FeedbackController;