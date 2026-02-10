// controllers/FeedbackController.js
const FeedbackModel = require("../models/Feedback");

const FeedbackController = {
  // ==================== BUYER CONTROLLERS ====================
  
  // Lấy danh sách sản phẩm trong đơn hàng để feedback
  getOrderProductsForFeedback: async (req, res) => {
    try {
      const { orderId } = req.params;
      const AccountId = req.user.AccountId;
      
      console.log("Getting products for order:", orderId, "for user:", AccountId);
      
      // Kiểm tra đơn hàng có thuộc về user không - GỌI MODEL
      const hasPermission = await FeedbackModel.checkOrderOwnership(orderId, AccountId);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập đơn hàng này"
        });
      }
      
      // Lấy danh sách sản phẩm - GỌI MODEL
      const products = await FeedbackModel.getOrderProductsForFeedback(orderId, AccountId);
      
      console.log("Found products:", products.length);
      
      // Format image URLs
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const formattedProducts = products.map(product => ({
        OrderDetailId: product.OrderDetailId,
        OrderId: product.OrderId,
        ProductId: product.ProductId,
        ProductName: product.ProductName,
        ProductImage: product.ProductImage 
          ? (product.ProductImage.startsWith('http')
              ? product.ProductImage
              : `${baseUrl}/uploads/ProductImage/${product.ProductImage}`)
          : null,
        StallName: product.StallName,
        Quantity: product.Quantity,
        UnitPrice: product.UnitPrice,
        OrderDetailStatus: product.OrderDetailStatus,
        hasFeedback: !!product.FeedbackId,
        canFeedback: !product.FeedbackId && product.OrderDetailStatus === 4,
        FeedbackId: product.FeedbackId
      }));
      
      res.json({
        success: true,
        orderId,
        products: formattedProducts,
        total: formattedProducts.length,
        canFeedbackCount: formattedProducts.filter(p => p.canFeedback).length,
        hasFeedbackCount: formattedProducts.filter(p => p.hasFeedback).length
      });
      
    } catch (error) {
      console.error("Get order products for feedback error:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Tạo feedback
  createFeedback: async (req, res) => {
    try {
      const { OrderDetailId, Score, Content } = req.body;
      const AccountId = req.user.AccountId;
      const files = req.files;

      console.log("Creating feedback for OrderDetailId:", OrderDetailId, "by user:", AccountId);

      // Validation - Score không bắt buộc, mặc định 5
      if (!OrderDetailId || !Content) {
        return res.status(400).json({ 
          success: false,
          message: "Vui lòng điền đầy đủ thông tin đánh giá" 
        });
      }

      const scoreValue = Score ? parseInt(Score) : 5;

      if (scoreValue < 1 || scoreValue > 5) {
        return res.status(400).json({ 
          success: false,
          message: "Điểm đánh giá phải từ 1 đến 5 sao" 
        });
      }

      if (Content.length < 10 || Content.length > 500) {
        return res.status(400).json({ 
          success: false,
          message: "Nội dung đánh giá phải từ 10 đến 500 ký tự" 
        });
      }

      const orderDetail = await FeedbackModel.validateOrderDetailForFeedback(OrderDetailId, AccountId);
      if (!orderDetail) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy sản phẩm hoặc sản phẩm chưa được giao thành công" 
        });
      }

      const hasExistingFeedback = await FeedbackModel.checkExistingFeedback(OrderDetailId, AccountId);
      if (hasExistingFeedback) {
        return res.status(400).json({ 
          success: false,
          message: "Bạn đã đánh giá sản phẩm này trước đó" 
        });
      }

      const feedbackData = {
        AccountId,
        OrderDetailId,
        Score: scoreValue,
        Content,
        Images: files
      };

      const feedbackId = await FeedbackModel.create(feedbackData);

      res.status(201).json({ 
        success: true,
        message: "Đánh giá thành công",
        feedbackId,
        productName: orderDetail.ProductName
      });

    } catch (error) {
      console.error("Create feedback error:", error);
      res.status(500).json({ 
        success: false,
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

      if (filters.page < 1) filters.page = 1;
      if (filters.limit < 1 || filters.limit > 100) filters.limit = 10;

      const result = await FeedbackModel.getFeedbacksWithPagination(AccountId, filters);
      
      const stats = await FeedbackModel.getUserFeedbackStats(AccountId);

      // Format URLs
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const formattedFeedbacks = result.feedbacks.map(feedback => ({
        ...feedback,
        AccountAvatar: feedback.AccountAvatar
          ? `${baseUrl}/uploads/AccountAvatar/${feedback.AccountAvatar}`
          : `${baseUrl}/uploads/AccountAvatar/avtDf.png`,
        Images: feedback.Images ? feedback.Images.map(img => 
          `${baseUrl}/uploads/feedback/${img}`
        ) : []
      }));

      res.json({
        success: true,
        feedbacks: formattedFeedbacks,
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
        success: false,
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

      if (!score && !content) {
        return res.status(400).json({ 
          success: false,
          message: "Không có thông tin nào để cập nhật" 
        });
      }

      if (score && (score < 1 || score > 5)) {
        return res.status(400).json({ 
          success: false,
          message: "Điểm đánh giá phải từ 1 đến 5 sao" 
        });
      }

      if (content && (content.length < 10 || content.length > 500)) {
        return res.status(400).json({ 
          success: false,
          message: "Nội dung đánh giá phải từ 10 đến 500 ký tự" 
        });
      }

      const hasPermission = await FeedbackModel.checkFeedbackOwnership(feedbackId, AccountId);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          message: "Bạn không có quyền chỉnh sửa đánh giá này" 
        });
      }

      const updateData = {};
      if (score) updateData.Score = score;
      if (content) updateData.Content = content;

      const isUpdated = await FeedbackModel.updateFeedback(feedbackId, updateData);
      
      if (!isUpdated) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy đánh giá để cập nhật" 
        });
      }

      res.json({ 
        success: true,
        message: "Cập nhật đánh giá thành công",
        feedbackId 
      });

    } catch (error) {
      console.error("Update feedback error:", error);
      res.status(500).json({ 
        success: false,
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

      const hasPermission = await FeedbackModel.checkFeedbackOwnership(feedbackId, AccountId);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          message: "Bạn không có quyền xóa đánh giá này" 
        });
      }

      const isDeleted = await FeedbackModel.deleteFeedback(feedbackId, AccountId);
      
      if (!isDeleted) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy đánh giá để xóa" 
        });
      }

      res.json({ 
        success: true,
        message: "Xóa đánh giá thành công",
        feedbackId 
      });

    } catch (error) {
      console.error("Delete feedback error:", error);
      res.status(500).json({ 
        success: false,
        message: "Đã xảy ra lỗi khi xóa đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ==================== PUBLIC CONTROLLERS ====================
  
  // Trong hàm getProductFeedbacks
getProductFeedbacks: async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const validatedPage = page < 1 ? 1 : page;
    const validatedLimit = (limit < 1 || limit > 50) ? 10 : limit;

    const [feedbacks, rating] = await Promise.all([
      FeedbackModel.getFeedbacksByProductId(productId, validatedPage, validatedLimit),
      FeedbackModel.getProductAverageRating(productId)
    ]);

    // Debug: in ra feedbacks để xem có Images không
    console.log("Feedbacks raw from model:", JSON.stringify(feedbacks, null, 2));
    console.log("First feedback Images:", feedbacks[0]?.Images);

    // Format URLs
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const formattedFeedbacks = feedbacks.map(feedback => ({
      ...feedback,
      AccountAvatar: feedback.AccountAvatar
        ? `${baseUrl}/uploads/AccountAvatar/${feedback.AccountAvatar}`
        : `${baseUrl}/uploads/AccountAvatar/avtDf.png`,
      Images: feedback.Images ? feedback.Images.map(img => 
        `${baseUrl}/uploads/feedback/${img}`
      ) : []
    }));

    // Debug formatted feedbacks
    console.log("Formatted feedbacks Images:", formattedFeedbacks[0]?.Images);

    res.json({
      success: true,
      feedbacks: formattedFeedbacks,
      rating: {
        average: Number(rating.avgScore).toFixed(1),
        total: rating.totalReviews
      },
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: rating.totalReviews,
        totalPages: Math.ceil(rating.totalReviews / validatedLimit)
      }
    });

  } catch (error) {
    console.error("Get product feedbacks error:", error);
    res.status(500).json({ 
      success: false,
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

      const validatedPage = page < 1 ? 1 : page;
      const validatedLimit = (limit < 1 || limit > 50) ? 10 : limit;

      const [feedbacks, rating, stats] = await Promise.all([
        FeedbackModel.getFeedbacksByStallId(stallId, validatedPage, validatedLimit),
        FeedbackModel.getStallAverageRating(stallId),
        FeedbackModel.getStallFeedbackStatistics(stallId)
      ]);

      // Format URLs
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      // Format URL đầy đủ cho feedbacks
const formattedFeedbacks = feedbacks.map(feedback => ({
  ...feedback,
  AccountAvatar: feedback.AccountAvatar
    ? `${baseUrl}/uploads/AccountAvatar/${feedback.AccountAvatar}`
    : `${baseUrl}/uploads/AccountAvatar/avtDf.png`,
  // QUAN TRỌNG: Format URL đầy đủ ngay từ controller
  Images: feedback.Images ? feedback.Images.map(img => {
    // Xử lý để đảm bảo chỉ có tên file
    let filename = img;
    if (img.includes('/')) {
      const parts = img.split('/');
      filename = parts[parts.length - 1];
    }
    // Trả về URL đầy đủ
    return `${baseUrl}/uploads/feedback/${filename}`;
  }) : []
}));

      res.json({
        success: true,
        feedbacks: formattedFeedbacks,
        rating: {
          average: Number(rating.avgScore).toFixed(1),
          total: rating.totalFeedbacks
        },
        stats: {
          total: stats.total,
          average: Number(stats.average).toFixed(1),
          distribution: {
            5: stats.five_star || 0,
            4: stats.four_star || 0,
            3: stats.three_star || 0,
            2: stats.two_star || 0,
            1: stats.one_star || 0
          }
        },
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total: rating.totalFeedbacks,
          totalPages: Math.ceil(rating.totalFeedbacks / validatedLimit)
        }
      });

    } catch (error) {
      console.error("Get stall feedbacks error:", error);
      res.status(500).json({ 
        success: false,
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
          success: false,
          message: "Không tìm thấy đánh giá" 
        });
      }

      // Format URLs
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const formattedFeedback = {
        ...feedback,
        AccountAvatar: feedback.AccountAvatar
          ? `${baseUrl}/uploads/AccountAvatar/${feedback.AccountAvatar}`
          : `${baseUrl}/uploads/AccountAvatar/avtDf.png`,
        Images: feedback.Images ? feedback.Images.map(img => 
          `${baseUrl}/uploads/feedback/${img}`
        ) : []
      };

      res.json({
        success: true,
        feedback: formattedFeedback
      });

    } catch (error) {
      console.error("Get feedback detail error:", error);
      res.status(500).json({ 
        success: false,
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
          success: false,
          eligible: false,
          message: "Không tìm thấy sản phẩm hoặc sản phẩm chưa được giao thành công" 
        });
      }

      const hasExistingFeedback = await FeedbackModel.checkExistingFeedback(orderDetailId, AccountId);
      
      res.json({
        success: true,
        eligible: !hasExistingFeedback,
        productName: orderDetail.ProductName,
        hasExistingFeedback,
        existingFeedbackId: hasExistingFeedback ? (await FeedbackModel.getFeedbackByOrderDetail(orderDetailId, AccountId))?.FeedbackId : null
      });

    } catch (error) {
      console.error("Check feedback eligibility error:", error);
      res.status(500).json({ 
        success: false,
        message: "Đã xảy ra lỗi khi kiểm tra điều kiện đánh giá",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Lấy chi tiết sản phẩm để feedback (cho modal)
  getProductFeedbackDetail: async (req, res) => {
    try {
      const { orderDetailId } = req.params;
      const AccountId = req.user.AccountId;
      
      const product = await FeedbackModel.validateOrderDetailForFeedback(orderDetailId, AccountId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Sản phẩm không tồn tại hoặc đã được đánh giá"
        });
      }
      
      const hasFeedback = await FeedbackModel.checkExistingFeedback(orderDetailId, AccountId);
      
      res.json({
        success: true,
        product: {
          ...product,
          canFeedback: !hasFeedback
        }
      });
      
    } catch (error) {
      console.error("Get product feedback detail error:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi lấy thông tin sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = FeedbackController;