const { pool } = require("../config/db");

const Product = {
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT
    p.ProductId,
    p.ProductName,
    p.Description,
    p.Price,
    p.Image,
    p.Status,
    p.IsActive,
    c.CategoryId,
    c.CategoryName,
    c.CategoryImage,
    s.StallName
FROM Products p
JOIN ProductCategory pc ON p.ProductId = pc.ProductId
JOIN Categories c ON pc.CategoryId = c.CategoryId
JOIN Stalls s ON p.StallId = s.StallId
ORDER BY p.ProductId DESC;
    `);

    return rows;
  },

  updateActive: async (id, isActive) => {
    await pool.execute(
      "UPDATE Products SET IsActive = ? WHERE ProductId = ?",
      [isActive, id]
    );
  }
  
};

module.exports = Product;
