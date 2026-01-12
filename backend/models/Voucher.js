const { sql } = require("../config/db");

module.exports = {
  getActive: async () => {
    const result = await sql.query(`
      SELECT * FROM Vouchers WHERE Endtime >= GETDATE()
    `);
    return result.recordset;
  }
};
