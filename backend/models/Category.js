const { pool } = require("../config/db");

const Category = {
  /**
   * Lấy toàn bộ danh mục
   */
  getAll: async () => {
    const sql = `
      SELECT 
        CategoryId,
        CategoryName,
        CategoryImage
      FROM Categories
      ORDER BY CategoryId ASC
    `;

    const [rows] = await pool.query(sql);
    return rows;
  }
};

module.exports = Category;
