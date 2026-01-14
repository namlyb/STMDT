const { pool } = require("../config/db");

const Cart = {
  getByAccountId: async (accountId) => {
    const sql = `
      SELECT 
        c.CartId,
        c.Quantity,

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
  }
};

module.exports = Cart;
