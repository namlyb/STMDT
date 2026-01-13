const { pool } = require("../config/db");

const Product = {
  getAll: async () => {
    const sql = `
      SELECT 
        ProductId,
        ProductName,
        Price,
        Image,
        Description,
        Status,
        IsActive,
        StallId
      FROM Products
      ORDER BY ProductId DESC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },

  getRandom: async (limit = 18) => {
    const sql = `
      SELECT 
        ProductId,
        ProductName,
        Price,
        Image
      FROM Products
      WHERE IsActive = 1
      ORDER BY RAND()
      LIMIT ?
    `;
    const [rows] = await pool.query(sql, [Number(limit)]);
    return rows;
  },

  getByCategory: async (categoryId) => {
    const sql = `
      SELECT 
        p.ProductId,
        p.ProductName,
        p.Price,
        p.Image
      FROM Products p
      JOIN ProductCategory pc ON p.ProductId = pc.ProductId
      WHERE pc.CategoryId = ?
        AND p.IsActive = 1
    `;
    const [rows] = await pool.query(sql, [categoryId]);
    return rows;
  },

  getById: async (id) => {
    const sql = `
      SELECT *
      FROM Products
      WHERE ProductId = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  },

  updateActive: async (id, isActive) => {
    const sql = `
      UPDATE Products
      SET IsActive = ?
      WHERE ProductId = ?
    `;
    await pool.query(sql, [isActive, id]);
  },
  search: async ({ categoryId, keyword }) => {
  let sql = `
    SELECT DISTINCT p.ProductId, p.ProductName, p.Price, p.Image
    FROM Products p
    LEFT JOIN ProductCategory pc ON p.ProductId = pc.ProductId
    WHERE p.IsActive = 1
  `;
  const params = [];

  if (categoryId) {
    sql += " AND pc.CategoryId = ?";
    params.push(categoryId);
  }

  if (keyword) {
    sql += " AND p.ProductName LIKE ?";
    params.push(`%${keyword}%`);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

};

module.exports = Product;
