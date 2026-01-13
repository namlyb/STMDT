const Category = require("../models/Category");

const CategoryController = {
  getAllCategories: async (req, res) => {
    try {
      const categories = await Category.getAll();
      res.status(200).json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy danh sách danh mục"
      });
    }
  }
};

module.exports = CategoryController;