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
        Quantity = Quantity + VALUES(Quantity),
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
  }
};

module.exports = Cart;
