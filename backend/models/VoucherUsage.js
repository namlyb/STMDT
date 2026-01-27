const { pool } = require("../config/db");

const VoucherUsage = {

  checkReceived: async (voucherId, accountId) => {
    const [rows] = await pool.query(
      `SELECT * FROM VoucherUsage WHERE VoucherId=? AND AccountId=?`,
      [voucherId, accountId]
    );
    return rows[0];
  },

  create: async (voucherId, accountId) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check voucher còn không
      const [[voucher]] = await conn.query(
        `SELECT Quantity FROM Vouchers WHERE VoucherId=? FOR UPDATE`,
        [voucherId]
      );

      if (!voucher || voucher.Quantity <= 0) {
        throw new Error("OUT_OF_STOCK");
      }

      // Check user đã nhận chưa
      const [[used]] = await conn.query(
        `SELECT * FROM VoucherUsage WHERE VoucherId=? AND AccountId=?`,
        [voucherId, accountId]
      );

      if (used) {
        throw new Error("ALREADY_RECEIVED");
      }

      // Insert usage
      await conn.query(
        `INSERT INTO VoucherUsage (VoucherId, AccountId, Quantity)
         VALUES (?, ?, 1)`,
        [voucherId, accountId]
      );

      // Trừ quantity voucher
      await conn.query(
        `UPDATE Vouchers SET Quantity = Quantity - 1 WHERE VoucherId=?`,
        [voucherId]
      );

      await conn.commit();
      return true;

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  getByAccount: async (accountId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      vu.UsageId,
      v.VoucherId,
      v.VoucherName,
      v.DiscountType,
      v.DiscountValue,
      v.MinOrderValue,
      v.MaxDiscount,
      vu.Quantity,
      v.EndTime,
      v.CreatedBy
    FROM VoucherUsage vu
    JOIN Vouchers v ON v.VoucherId = vu.VoucherId
    WHERE vu.AccountId = ?
      AND vu.IsUsed = 0
      AND v.EndTime >= CURDATE()
    ORDER BY v.EndTime ASC
    `,
    [accountId]
  );
  return rows;
},


  getUnusedByAccount: async (accountId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      vu.UsageId,
      v.VoucherId,
      v.VoucherName,
      v.DiscountType,
      v.DiscountValue,
      v.MinOrderValue,
      v.MaxDiscount,
      v.EndTime,
      v.CreatedBy,
      s.StallId
    FROM VoucherUsage vu
    JOIN Vouchers v ON v.VoucherId = vu.VoucherId
    LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
    WHERE vu.AccountId = ?
      AND vu.IsUsed = 0
      AND v.EndTime >= CURDATE()
    `,
    [accountId]
  );
  return rows;
},



};

module.exports = VoucherUsage;
