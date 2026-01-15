const { pool } = require("../config/db");

const Address = {
  getAll: async () => {
    const [rows] = await pool.query(
      "SELECT * FROM Address ORDER BY AddressId DESC"
    );
    return rows;
  },

  getByAccountId: async (accountId) => {
    const [rows] = await pool.query(
      "SELECT * FROM Address WHERE AccountId = ? and Status = 1 ORDER BY AddressId DESC",
      [accountId]
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM Address WHERE AddressId = ?",
      [id]
    );
    return rows[0];
  },

  create: async ({ AccountId, Content }) => {
    const [result] = await pool.query(
      "INSERT INTO Address (AccountId, Content, Status) VALUES (?, ?, 1)",
      [AccountId, Content]
    );

    return {
      AddressId: result.insertId,
      AccountId,
      Content,
    };
  },

  update: async (id, Content) => {
    await pool.query(
      "UPDATE Address SET Content = ? WHERE AddressId = ?",
      [Content, id]
    );
  },

  delete: async (id) => {
    await pool.query(
      "UPDATE Address SET Status = 0 WHERE AddressId = ? And Status = 1",
      [id]
    );
  },
};

module.exports = Address;
