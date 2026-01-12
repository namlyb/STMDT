const { sql } = require("../config/db");

module.exports = {
  getByAccount: async (accountId) => {
    const result = await sql.query`
      SELECT * FROM Stalls WHERE AccountId = ${accountId}
    `;
    return result.recordset[0];
  }
};
