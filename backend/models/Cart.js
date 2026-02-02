const { pool } = require("../config/db");

const Cart = {
  getByAccountId: async (accountId) => {
    const sql = `
      SELECT 
        c.CartId,
        c.Quantity,
        c.UnitPrice,
        p.ProductId,
        p.ProductName,
        p.Description,
        p.Image
      FROM Carts c
      JOIN Products p ON c.ProductId = p.ProductId
      WHERE c.AccountId = ?
        AND c.Status = 1
    `;
    const [rows] = await pool.query(sql, [accountId]);
    return rows;
  },

  addToCart: async (accountId, productId, quantity) => {
    const sql = `
      INSERT INTO Carts (AccountId, ProductId, Quantity, Status, UnitPrice)
      SELECT ?, ?, ?, 1, p.Price
      FROM Products p
      WHERE p.ProductId = ?
      ON DUPLICATE KEY UPDATE
        Quantity = VALUES(Quantity),
        UnitPrice = p.Price,
        Status = 1
    `;
    await pool.query(sql, [accountId, productId, quantity, productId]);
  },

  updateQuantity: async (cartId, quantity) => {
    await pool.query(
      "UPDATE Carts SET Quantity = ? WHERE CartId = ? AND Status = 1",
      [quantity, cartId]
    );
  },

  removeCartItem: async (cartId) => {
    await pool.query(
      "UPDATE Carts SET Status = 0 WHERE CartId = ?",
      [cartId]
    );
  },

  getByIds: async (accountId, cartIds) => {
  if (!cartIds.length) return [];

  const [rows] = await pool.query(
    `
    SELECT 
      c.CartId,
      c.Quantity,
      c.UnitPrice,
      p.ProductId,
      p.ProductName,
      p.Description,
      p.Image
    FROM Carts c
    JOIN Products p ON c.ProductId = p.ProductId
    WHERE c.AccountId = ?
      AND c.CartId IN (?)
      AND c.Status = 1
    `,
    [accountId, cartIds]
  );

  return rows;
},

getCheckoutItems: async (accountId, cartIds) => {
    if (!cartIds.length) return [];

    const placeholders = cartIds.map(() => "?").join(",");
    const [rows] = await pool.query(
      `SELECT 
         c.CartId,
         c.Quantity,
         c.UnitPrice,
         (c.Quantity * c.UnitPrice) AS totalPrice,
         p.ProductId,
         p.ProductName,
         p.Image,
         s.StallId
       FROM Carts c
       JOIN Products p ON p.ProductId = c.ProductId
       JOIN Stalls s ON s.StallId = p.StallId
       WHERE c.AccountId = ?
         AND c.CartId IN (${placeholders})
         AND c.Status = 1`,
      [accountId, ...cartIds]
    );

    return rows;
  },

};

module.exports = Cart;
