const { sql } = require("../config/db");

module.exports = {
  create: async (data) => {
    const {
      orderDetailId,
      amount,
      transactionDate,
      transactionId,
      status
    } = data;

    await sql.query`
      INSERT INTO Payments
      (OrderDetailId, Amount, TransactionDate, TransactionId, Status)
      VALUES
      (${orderDetailId}, ${amount}, ${transactionDate}, ${transactionId}, ${status})
    `;
  },

  getByOrderDetail: async (orderDetailId) => {
    const result = await sql.query`
      SELECT * FROM Payments
      WHERE OrderDetailId = ${orderDetailId}
    `;
    return result.recordset;
  }
};
