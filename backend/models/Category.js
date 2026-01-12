const { sql } = require("../config/db");

module.exports = {
  getAll: async () => {
    const result = await sql.query(`SELECT * FROM Categories`);
    return result.recordset;
  },

  create: async (name) => {
    await sql.query`
      INSERT INTO Categories (CategoryName)
      VALUES (${name})
    `;
  }
};
