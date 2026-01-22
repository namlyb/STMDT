const { pool } = require("../config/db");

const Order = {
  getByIds: async (accountId, cartIds) => {
  const [rows] = await pool.query(
    `SELECT c.CartId, c.Quantity, c.UnitPrice, p.ProductId, p.ProductName, p.Description, p.Image
     FROM Carts c
     JOIN Products p ON c.ProductId = p.ProductId
     WHERE c.AccountId = ? AND c.CartId IN (?) AND c.Status = 1`,
    [accountId, cartIds]
  );
  return rows;
},

};