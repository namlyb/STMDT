const { pool } = require("../config/db");

const Category = {
  /**
   * Lấy toàn bộ danh mục
   */
  getAll: async () => {
    const [rows] = await pool.query(
      "SELECT CategoryId, CategoryName, CategoryImage FROM Categories"
    );
    return rows;
  }
};

module.exports = Category;
