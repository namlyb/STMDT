const Product = require("../models/Product");

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
      res.status(200).json(products);
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

  /* ================= PRODUCT DETAIL ================= */
  getProductDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.getById(id);

      if (!product) {
        return res.status(404).json({
          message: "Không tìm thấy sản phẩm"
        });
      }

      res.status(200).json(product);
    } catch (error) {
      console.error("Get product detail error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy chi tiết sản phẩm"
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

      res.json(products);
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ message: "Lỗi tìm kiếm sản phẩm" });
    }
  }
};

module.exports = ProductController;
