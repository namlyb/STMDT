const { pool } = require("../config/db");

module.exports = {
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        a.AccountId, a.Avt, a.Username, a.Name, a.Phone, a.IdentityNumber,
        a.DateOfBirth, a.Gender, a.IsActive, r.RoleName
      FROM Accounts a
      JOIN Roles r ON a.RoleId = r.RoleId
      ORDER BY a.AccountId DESC;
    `);
    return rows;
  },

  findByUsername: async (username) => {
    const [rows] = await pool.execute(
      "SELECT * FROM Accounts WHERE Username = ?",
      [username]
    );
    return rows[0];
  },

  create: async (data) => {
    const {
      username,
      password,
      name,
      phone,
      identityNumber,
      dateOfBirth,
      gender,
      roleId
    } = data;

    await pool.execute(
      `
      INSERT INTO Accounts
      (Username, Password, Name, Phone, IdentityNumber, DateOfBirth, Gender, RoleId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        password,
        name,
        phone,
        identityNumber,
        dateOfBirth,
        gender,
        roleId
      ]
    );
  },
  updateActive: async (id, isActive) => {
    await pool.execute(
      "UPDATE Accounts SET IsActive = ? WHERE AccountId = ?",
      [isActive, id]
    );
  }


};
