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
      SELECT AccountId, Username, Name, Password, RoleId, Avt AS Avatar
      FROM Accounts
      WHERE Username = ?
    `, [username]);
    return rows[0];
  }, // login used

  create: async ({ username, password, name, phone, identityNumber, dateOfBirth, gender, roleId = 2 }) => {
    const [result] = await pool.query(`
      INSERT INTO Accounts 
      (Username, Password, Name, Phone, IdentityNumber, DateOfBirth, Gender, IsActive, RoleId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [username, password, name, phone, identityNumber, dateOfBirth, gender, 1, roleId]);

    return {
      AccountId: result.insertId,
      username,
      name,
      phone,
      identityNumber,
      dateOfBirth,
      gender,
      isActive: 1,
      roleId
    };
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
    const { Username, Name, Phone, Password, RoleId } = data;
    await pool.query(
      `UPDATE Accounts SET Username = ?, Name = ?, Phone = ?, Password = ?, RoleId = ? WHERE AccountId = ?`,
      [Username, Name, Phone, Password, RoleId, id]
    );
  },

  updateProfile: async (id, data) => {
  const { Name, Phone, IdentityNumber, DateOfBirth, Gender } = data;
  await pool.query(
    `UPDATE Accounts 
     SET Name=?, Phone=?, IdentityNumber=?, DateOfBirth=?, Gender=?
     WHERE AccountId=?`,
    [Name, Phone, IdentityNumber, DateOfBirth, Gender, id]
  );
},

updateAvatar: async (id, filename) => {
  await pool.query(
    `UPDATE Accounts SET Avt=? WHERE AccountId=?`,
    [filename, id]
  );
},

};

module.exports = Account;
