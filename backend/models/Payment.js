const { pool } = require("../config/db");

const Payment = {
  // Tạo bản ghi thanh toán mới
  create: async (orderId, amount, transactionCode = null, status = 'pending') => {
    const [result] = await pool.query(
      `INSERT INTO Payments (OrderId, Amount, TransactionCode, Status, CreatedAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [orderId, amount, transactionCode, status]
    );
    return result.insertId;
  },

  // Cập nhật trạng thái thanh toán
  updateStatus: async (paymentId, status, transactionCode = null, transactionDate = null) => {
    let query = `UPDATE Payments SET Status = ?`;
    const params = [status];

    if (transactionCode) {
      query += `, TransactionCode = ?`;
      params.push(transactionCode);
    }
    if (transactionDate) {
      query += `, TransactionDate = ?`;
      params.push(transactionDate);
    }

    query += ` WHERE PaymentId = ?`;
    params.push(paymentId);

    await pool.query(query, params);
  },

  // Tìm payment theo OrderId
  findByOrderId: async (orderId) => {
    const [rows] = await pool.query(
      `SELECT * FROM Payments WHERE OrderId = ? ORDER BY CreatedAt DESC LIMIT 1`,
      [orderId]
    );
    return rows[0];
  },

  // Cập nhật theo transactionCode (webhook)
  updateByTransactionCode: async (transactionCode, status, transactionDate) => {
    await pool.query(
      `UPDATE Payments SET Status = ?, TransactionDate = ? WHERE TransactionCode = ?`,
      [status, transactionDate, transactionCode]
    );
  },

   updateById: async (paymentId, transactionCode, status, transactionDate) => {
    await pool.query(
      `UPDATE Payments SET TransactionCode = ?, Status = ?, TransactionDate = ? WHERE PaymentId = ?`,
      [transactionCode, status, transactionDate, paymentId]
    );
  },
  
};

module.exports = Payment;