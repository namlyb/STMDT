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
      `SELECT * FROM Address WHERE AccountId = ? and Status = 1 ORDER BY AddressId DESC`,
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

  create: async ({ AccountId, Name, Phone,Content }) => {
    const [result] = await pool.query(
      `INSERT INTO Address (AccountId, Name, Phone, Content, Status)
       VALUES (?, ?, ?, ?, 1)`,
      [AccountId, Name, Phone, Content]
    );

    return {
      AddressId: result.insertId,
      AccountId,
      Name,
      Phone,
      Content,
    };
  },

  update: async (id, { Name, Phone, Content }) => {
    await pool.query(
      "UPDATE Address SET Name = ?, Phone = ?, Content = ? WHERE AddressId = ?",
      [Name, Phone, Content, id]
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
