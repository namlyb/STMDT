const { pool } = require("../config/db");

const Account = {
  getAll: async () => {
    const [rows] = await pool.query(`
      SELECT a.*, r.RoleName
      FROM Accounts a
      LEFT JOIN Roles r ON a.RoleId = r.RoleId
    `);
    return rows;
  },

  updateActive: async (id, isActive) => {
    await pool.query(`UPDATE Accounts SET IsActive = ? WHERE AccountId = ?`, [isActive, id]);
  },

  getByUsername: async (username) => {
    const [rows] = await pool.query(`
      SELECT a.*, r.RoleName
      FROM Accounts a
      LEFT JOIN Roles r ON a.RoleId = r.RoleId
      WHERE a.Username = ?
    `, [username]);
    return rows[0];
  },

  create: async ({ username, password, roleId }) => {
    const [result] = await pool.query(`
      INSERT INTO Accounts (Username, Password, RoleId)
      VALUES (?, ?, ?)
    `, [username, password, roleId]);

    return { AccountId: result.insertId, username, roleId };
  },

  getById: async (id) => {
    const [rows] = await pool.query(
      `SELECT a.*, r.RoleName 
     FROM Accounts a 
     LEFT JOIN Roles r ON a.RoleId = r.RoleId 
     WHERE a.AccountId = ?`,
      [id]
    );
    return rows[0];
  },


  update: async (id, data) => {
    const { Username, Name, Phone, Password, roleId } = data;
    await pool.query(
      `UPDATE Accounts SET Username = ?, Name = ?, Phone = ?, Password = ?, RoleId = ? WHERE AccountId = ?`,
      [Username, Name, Phone, Password, roleId, id]
    );
  },

};

module.exports = Account;
