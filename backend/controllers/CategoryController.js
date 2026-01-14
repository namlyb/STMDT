const Category = require("../models/Category");

const CategoryController = {
  getAllCategories: async (req, res) => {
    try {
      const categories = await Category.getAll();

      const result = categories.map(c => ({
      ...c,
      CategoryImage: `${req.protocol}://${req.get("host")}/uploads/CategoryImage/${c.CategoryImage}`
    }));

    res.status(200).json(result);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({
        message: "Lỗi khi lấy danh sách danh mục"
      });
    }
  }
};

module.exports = CategoryController;