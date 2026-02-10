// controllers/ProductController.js
const Product = require("../models/Product");
const Stall = require("../models/Stall");
const Feedback = require("../models/Feedback");
const OrderDetail = require("../models/OrderDetail");

const ProductController = {
  /* ================= GET ALL PRODUCTS ================= */
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.getAll();
      res.status(200).json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy danh sách sản phẩm"
      });
    }
  },

  /* ================= RANDOM PRODUCTS ================= */
  getRandomProducts: async (req, res) => {
    try {
      const limit = req.query.limit || 16;
      const products = await Product.getRandom(limit);
      const result = products.map(p => ({
        ...p,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${p.Image}`
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Get random products error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy sản phẩm ngẫu nhiên"
      });
    }
  },

  /* ================= PRODUCTS BY CATEGORY ================= */
  getProductsByCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const products = await Product.getByCategory(id);
      res.status(200).json(products);
    } catch (error) {
      console.error("Get products by category error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy sản phẩm theo danh mục"
      });
    }
  },

  /* ================= UPDATE ACTIVE ================= */
  updateProductActive: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        return res.status(400).json({
          message: "Thiếu isActive"
        });
      }

      await Product.updateActive(id, isActive);
      res.status(200).json({
        message: "Updated successfully"
      });
    } catch (error) {
      console.error("Update product active error:", error);
      res.status(500).json({
        message: "Lỗi khi cập nhật trạng thái sản phẩm"
      });
    }
  },

  /* ================= SEARCH PRODUCTS ================= */
  searchProducts: async (req, res) => {
    try {
      const { category, keyword } = req.query;

      const products = await Product.search({
        categoryId: category,
        keyword
      });

      const result = products.map(p => ({
        ...p,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${p.Image}`
      }));

      res.json(result);
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ message: "Lỗi tìm kiếm sản phẩm" });
    }
  },

  /* ================= GET PRODUCT DETAIL ================= */
  getProductDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const product = await Product.getById(id);
      if (!product) {
        return res.status(404).json({
          message: "Không tìm thấy sản phẩm"
        });
      }

      const stall = await Stall.getByProductId(id);
      
      // Lấy feedbacks với phân trang
      const [feedbacks, ratingInfo] = await Promise.all([
        Feedback.getFeedbacksByProductId(id, page, limit),
        Feedback.getProductAverageRating(id)
      ]);
      
      // Lấy thống kê feedback
      const feedbackStats = await Feedback.getFeedbackStatistics(id);
      
      const totalOrders = await OrderDetail.countByProductId(id);
      
      // Format URL đầy đủ cho product image
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const formattedProduct = {
        ...product,
        Image: product.Image 
          ? `${baseUrl}/uploads/ProductImage/${product.Image}`
          : `${baseUrl}/uploads/ProductImage/default.png`
      };
      
      // Format URL đầy đủ cho feedbacks - QUAN TRỌNG
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

      res.status(200).json({
        success: true,
        product: formattedProduct,
        stall,
        feedbacks: formattedFeedbacks,
        rating: {
          average: parseFloat(ratingInfo.avgScore).toFixed(1) || "0.0",
          totalReviews: ratingInfo.totalReviews || 0
        },
        stats: feedbackStats,
        totalOrders,
        pagination: {
          page,
          limit,
          total: ratingInfo.totalReviews || 0,
          totalPages: Math.ceil((ratingInfo.totalReviews || 0) / limit)
        }
      });

    } catch (error) {
      console.error("🔥 Get product detail error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy chi tiết sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /* ================= GET PRODUCTS BY SELLER ================= */
  getProductsBySeller: async (req, res) => {
    try {
      const { accountId } = req.params;
      const products = await Product.getBySellerId(accountId);

      const result = products.map(p => ({
        ...p,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${p.Image}`
      }));

      res.status(200).json({
        success: true,
        products: result
      });
    } catch (err) {
      console.error("Get seller products error:", err);
      res.status(500).json({ 
        success: false,
        message: "Lỗi khi lấy sản phẩm của người bán" 
      });
    }
  },

  /* ================= UPDATE PRODUCT STATUS ================= */
  updateProductStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status === undefined) {
        return res.status(400).json({ 
          success: false,
          message: "Thiếu status" 
        });
      }

      await Product.updateStatus(id, status);
      res.status(200).json({ 
        success: true,
        message: "Cập nhật trạng thái thành công" 
      });
    } catch (err) {
      console.error("Update product status error:", err);
      res.status(500).json({ 
        success: false,
        message: "Lỗi khi cập nhật trạng thái sản phẩm" 
      });
    }
  },

  /* ================= UPDATE PRODUCT ================= */
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { ProductName, Price, Description } = req.body;
      let Image = req.body.Image;

      if (req.file) {
        Image = req.file.filename;
      }

      await Product.update(id, {
        ProductName,
        Price,
        Description,
        Image
      });

      res.json({ 
        success: true,
        message: "Cập nhật sản phẩm thành công" 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false,
        message: "Lỗi cập nhật sản phẩm" 
      });
    }
  },

  /* ================= GET RELATED PRODUCTS ================= */
  getRelatedProducts: async (req, res) => {
    try {
      const { id } = req.params;
      const relatedProducts = await Product.getRelatedProducts(id);
      
      const productsWithImages = relatedProducts.map(product => ({
        ...product,
        Image: product.Image 
          ? `${req.protocol}://${req.get("host")}/uploads/ProductImage/${product.Image}`
          : `${req.protocol}://${req.get("host")}/uploads/ProductImage/default.png`
      }));
      
      res.json({
        success: true,
        products: productsWithImages
      });
    } catch (error) {
      console.error("Error in getRelatedProducts:", error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server" 
      });
    }
  },

  /* ================= CREATE PRODUCT ================= */
  createProduct: async (req, res) => {
    try {
      const { StallId, ProductName, Price, Description, CategoryIds } = req.body;
      const Image = req.file ? req.file.filename : null;

      // Validation
      if (!StallId || !ProductName || !Price || !Description) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng điền đầy đủ thông tin sản phẩm"
        });
      }

      if (!Image) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn ảnh sản phẩm"
        });
      }

      const productData = {
        StallId,
        ProductName,
        Price: parseInt(Price),
        Description,
        Image
      };

      const productId = await Product.create(productData, CategoryIds);

      res.status(201).json({
        success: true,
        message: "Tạo sản phẩm thành công",
        productId
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi tạo sản phẩm",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /* ================= GET PRODUCT FEEDBACKS (API RIÊNG) ================= */
  getProductFeedbacks: async (req, res) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const score = req.query.score ? parseInt(req.query.score) : null;

      // Lấy feedbacks với filter
      const options = {};
      if (score) {
        options.minScore = score;
        options.maxScore = score;
      }

      const [feedbacks, ratingInfo] = await Promise.all([
        Feedback.getFeedbacksWithDetails(id, { page, limit, ...options }),
        Feedback.getProductAverageRating(id)
      ]);

      // Format URL ảnh
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

      res.json({
        success: true,
        feedbacks: formattedFeedbacks,
        rating: {
          average: Number(ratingInfo.avgScore).toFixed(1),
          total: ratingInfo.totalReviews
        },
        pagination: {
          page,
          limit,
          total: ratingInfo.totalReviews,
          totalPages: Math.ceil(ratingInfo.totalReviews / limit)
        }
      });
    } catch (error) {
      console.error("Get product feedbacks error:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi lấy đánh giá sản phẩm"
      });
    }
  },

  /* ================= GET PRODUCT STATISTICS ================= */
  getProductStatistics: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [ratingInfo, orderCount, feedbackStats] = await Promise.all([
        Feedback.getProductAverageRating(id),
        OrderDetail.countByProductId(id),
        Feedback.getFeedbackStatistics(id)
      ]);

      res.json({
        success: true,
        statistics: {
          rating: {
            average: Number(ratingInfo.avgScore).toFixed(1),
            total: ratingInfo.totalReviews
          },
          totalOrders: orderCount,
          feedbackDistribution: feedbackStats.distribution
        }
      });
    } catch (error) {
      console.error("Get product statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi lấy thống kê sản phẩm"
      });
    }
  }
};

module.exports = ProductController;