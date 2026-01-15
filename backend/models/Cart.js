const { pool } = require("../config/db");

const Cart = {
  getByAccountId: async (accountId) => {
    const sql = `
      SELECT 
        c.CartId,
        c.Quantity,
        p.Description,
        p.ProductId,
        p.ProductName,
        p.Price,
        p.Image
      FROM Carts c
      JOIN Products p ON c.ProductId = p.ProductId
      WHERE c.AccountId = ? AND c.Status = 1
    `;

    const [rows] = await pool.query(sql, [accountId]);
    return rows;
  },

  addToCart: async (accountId, productId, quantity) => {
  const sql = `
    INSERT INTO Carts (AccountId, ProductId, Quantity, Status)
    VALUES (?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      Quantity = VALUES(Quantity),
      Status = 1
  `;
  const [rows] = await pool.query(sql, [accountId, productId, quantity]);
  return rows;
},

  removeCartItem: async (cartId) => {
    const sql = `UPDATE Carts SET Status = 0 WHERE CartId = ?`;
    const [rows] = await pool.query(sql, [cartId]);
    return rows;
  }

};

module.exports = Cart;
