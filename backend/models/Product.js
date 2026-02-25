const { pool } = require("../config/db");

const Product = {
  getAll: async () => {
    const sql = `
      SELECT 
        p.ProductId,
        p.ProductName,
        p.Price,
        p.Description,
        p.Image,
        p.Status,
        p.IsActive,
        s.StallId,
        s.StallName AS StallName,
        c.CategoryId,
        c.CategoryName
      FROM Products p
      JOIN Stalls s ON p.StallId = s.StallId
      LEFT JOIN ProductCategory pc ON p.ProductId = pc.ProductId
      LEFT JOIN Categories c ON pc.CategoryId = c.CategoryId
      ORDER BY p.ProductId DESC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },


  getRandom: async (limit = 16) => {
    const sql = `
      SELECT 
        ProductId,
        ProductName,
        Price,
        Image
      FROM Products
      WHERE IsActive = 1 and Status = 1
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

  // models/Product.js
  search: async ({ categoryId, keyword }) => {
    let sql = `
    SELECT 
      p.ProductId, 
      p.ProductName, 
      p.Price, 
      p.Image,
      IFNULL(od.totalOrders, 0) AS countOrders
    FROM Products p
    LEFT JOIN ProductCategory pc ON p.ProductId = pc.ProductId
    LEFT JOIN (
      SELECT ProductId, COUNT(OrderDetailId) AS totalOrders
      FROM OrderDetails
      GROUP BY ProductId
    ) od ON p.ProductId = od.ProductId
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
  },

  getBySellerId: async (accountId) => {
    const sql = `
      SELECT p.ProductId, p.ProductName, p.Price, p.Description, p.Image, p.Status, p.IsActive,
             s.StallId, s.StallName
      FROM Products p
      JOIN Stalls s ON p.StallId = s.StallId
      WHERE s.AccountId = ?
      ORDER BY p.ProductId DESC
    `;
    const [rows] = await pool.query(sql, [accountId]);
    return rows;
  },

  updateStatus: async (id, status) => {
  const sql = `
    UPDATE Products
    SET Status = ?
    WHERE ProductId = ?
  `;
  await pool.query(sql, [status, id]);
},

update: async (id, data) => {
  const sql = `
    UPDATE Products
    SET ProductName = ?, Price = ?, Description = ?, Image = ?
    WHERE ProductId = ?
  `;
  await pool.query(sql, [
    data.ProductName,
    data.Price,
    data.Description,
    data.Image,
    id
  ]);
},
  getRelatedProducts: async (productId) => {
  try {
    // Lấy category của sản phẩm hiện tại
    const [categoryRows] = await pool.query(
      `SELECT CategoryId FROM ProductCategory WHERE ProductId = ?`,
      [productId]
    );
    
    if (categoryRows.length === 0) return [];
    
    const categoryId = categoryRows[0].CategoryId;
    
    // Lấy sản phẩm cùng category (trừ sản phẩm hiện tại) với số lượng đã bán
    const [products] = await pool.query(
      `SELECT DISTINCT 
        p.*,
        IFNULL(SUM(od.Quantity), 0) AS SoldCount
       FROM Products p
       JOIN ProductCategory pc ON p.ProductId = pc.ProductId
       LEFT JOIN OrderDetails od ON p.ProductId = od.ProductId
       WHERE pc.CategoryId = ? 
         AND p.ProductId != ? 
         AND p.IsActive = 1
         AND p.Status = 1
       GROUP BY p.ProductId
       ORDER BY RAND()
       LIMIT 10`,
      [categoryId, productId]
    );
    
    return products;
  } catch (error) {
    console.error("Error in getRelatedProducts:", error);
    throw error;
  }
},

getByStallId: async (stallId) => {
  const sql = `
    SELECT ProductId, ProductName, Price, Image, Status
    FROM Products
    WHERE StallId = ?
      AND IsActive = 1
  `;
  const [rows] = await pool.query(sql, [stallId]);
  return rows;
},

  create: async (productData, categoryIds) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert vào Products
      const [result] = await connection.query(
        `INSERT INTO Products 
         (StallId, ProductName, Price, Description, Image, Status, IsActive, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [
          productData.StallId,
          productData.ProductName,
          productData.Price,
          productData.Description,
          productData.Image
        ]
      );
      const productId = result.insertId;

      // 2. Insert vào ProductCategory
      if (categoryIds && categoryIds.length > 0) {
        const values = categoryIds.map(catId => [productId, catId]);
        await connection.query(
          `INSERT INTO ProductCategory (ProductId, CategoryId) VALUES ?`,
          [values]
        );
      }

      await connection.commit();
      return productId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

};

module.exports = Product;
