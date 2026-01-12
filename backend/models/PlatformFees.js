const { sql } = require("../config/db");

module.exports = {
  getCurrentFee: async () => {
    const result = await sql.query(`
      SELECT TOP 1 *
      FROM PlatformFees
      ORDER BY CreatedAt DESC
    `);
    return result.recordset[0];
  },

  create: async (percentValue, condition) => {
    await sql.query`
      INSERT INTO PlatformFees (PercentValue, Condition, CreatedAt)
      VALUES (${percentValue}, ${condition}, GETDATE())
    `;
  }
};
