const { sql } = require("../config/db");

module.exports = {
  useVoucher: async (voucherId, accountId, quantity) => {
    await sql.query`
      INSERT INTO VoucherUsage (VoucherId, AccountId, Quantity)
      VALUES (${voucherId}, ${accountId}, ${quantity})
    `;
  }
};
