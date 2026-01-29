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
  getProductDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.getById(id);
      if (!product) {
        return res.status(404).json({
          message: "Không tìm thấy sản phẩm"
        });
      }

      const stall = await Stall.getByProductId(id);
      const feedbacks = await Feedback.getByProductId(id);
      const avgScore = await Feedback.getAvgScoreByProductId(id);
      const totalOrders = await OrderDetail.countByProductId(id);

      res.status(200).json({
        product,
        stall,
        feedbacks,
        avgScore,
        totalOrders
      });

    } catch (error) {
      console.error("🔥 Get product detail error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy chi tiết sản phẩm"
      });
    }
  },

  getProductsBySeller: async (req, res) => {
    try {
      const { accountId } = req.params; // Lấy accountId từ params
      const products = await Product.getBySellerId(accountId);

      // Thêm đường dẫn ảnh đầy đủ
      const result = products.map(p => ({
        ...p,
        Image: `${req.protocol}://${req.get("host")}/uploads/ProductImage/${p.Image}`
      }));

      res.status(200).json(result);
    } catch (err) {
      console.error("Get seller products error:", err);
      res.status(500).json({ message: "Lỗi khi lấy sản phẩm của người bán" });
    }
  },

  // ================= UPDATE STATUS =================
updateProductStatus: async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({ message: "Thiếu status" });
    }

    await Product.updateStatus(id, status);
    res.status(200).json({ message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    console.error("Update product status error:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật trạng thái sản phẩm" });
  }
},

updateProduct: async (req, res) => {
  try {
    const { id } = req.params;
    const { ProductName, Price, Description} = req.body;
    let Image = req.body.Image; // Mặc định lấy từ body

    // Nếu có file ảnh mới, sử dụng tên file mới
    if (req.file) {
      Image = req.file.filename;
    }

    await Product.update(id, {
      ProductName,
      Price,
      Description,
      Image
    },
    { where: { ProductId: req.params.id } }
  );

    res.json({ message: "Cập nhật sản phẩm thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi cập nhật sản phẩm" });
  }
},

getRelatedProducts: async (req, res) => {
  try {
    const { id } = req.params;
    const relatedProducts = await Product.getRelatedProducts(id);
    
    // Format image URL
    const productsWithImages = relatedProducts.map(product => ({
      ...product,
      Image: product.Image 
        ? `${req.protocol}://${req.get("host")}/uploads/ProductImage/${product.Image}`
        : `${req.protocol}://${req.get("host")}/uploads/ProductImage/default.png`
    }));
    
    res.json(productsWithImages);
  } catch (error) {
    console.error("Error in getRelatedProducts:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
},


};

module.exports = ProductController;
