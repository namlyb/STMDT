const { sql } = require("../config/db");

module.exports = {
  getAllActive: async () => {
    const result = await sql.query(`
      SELECT * FROM Shippers
      WHERE Status = 1
    `);
    return result.recordset;
  },

  create: async (companyName, phone) => {
    await sql.query`
      INSERT INTO Shippers (CompanyName, Phone)
      VALUES (${companyName}, ${phone})
    `;
  }
};
