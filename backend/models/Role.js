const { sql } = require("../config/db");

module.exports = {
  getAll: async () => {
    const result = await sql.query(`SELECT * FROM Roles`);
    return result.recordset;
  },

  create: async (roleName) => {
    await sql.query`
      INSERT INTO Roles (RoleName)
      VALUES (${roleName})
    `;
  }
};
