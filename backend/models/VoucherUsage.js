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

  // THÊM HAI HÀM NÀY:
  
  // Kiểm tra voucher có hợp lệ không
  validateVoucher: async (usageId, accountId) => {
    const [rows] = await pool.query(
      `SELECT vu.*, v.* 
       FROM VoucherUsage vu
       JOIN Vouchers v ON vu.VoucherId = v.VoucherId
       LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
       WHERE vu.UsageId = ? 
         AND vu.AccountId = ?
         AND vu.Quantity > 0
         AND v.EndTime >= CURDATE()`,
      [usageId, accountId]
    );
    return rows[0];
  },

  // Đánh dấu voucher đã sử dụng
  markAsUsed: async (usageId, quantity = 1) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Cập nhật quantity và IsUsed
      const [updateResult] = await connection.query(
        `UPDATE VoucherUsage 
         SET Quantity = Quantity - ?,
             IsUsed = CASE 
               WHEN Quantity - ? <= 0 THEN 1 
               ELSE IsUsed 
             END
         WHERE UsageId = ? AND Quantity >= ?`,
        [quantity, quantity, usageId, quantity]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Voucher không đủ quantity");
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  decreaseQuantity: async (usageId, quantityToDecrease) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy số lượng hiện tại
      const [rows] = await connection.query(
        'SELECT Quantity FROM VoucherUsage WHERE UsageId = ? FOR UPDATE',
        [usageId]
      );

      if (rows.length === 0) {
        throw new Error('Voucher không tồn tại');
      }

      const currentQuantity = rows[0].Quantity;

      if (currentQuantity < quantityToDecrease) {
        throw new Error('Số lượng voucher không đủ');
      }

      const newQuantity = currentQuantity - quantityToDecrease;
      const isUsed = newQuantity <= 0 ? 1 : 0;

      // Cập nhật
      await connection.query(
        'UPDATE VoucherUsage SET Quantity = ?, IsUsed = ? WHERE UsageId = ?',
        [newQuantity, isUsed, usageId]
      );

      await connection.commit();
      return { newQuantity, isUsed };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  decrementVoucherQuantity: async (usageId, quantityToDecrement) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Kiểm tra voucher tồn tại và có đủ quantity không
    const [voucherRows] = await connection.query(
      `SELECT vu.*, v.* 
       FROM VoucherUsage vu
       JOIN Vouchers v ON vu.VoucherId = v.VoucherId
       WHERE vu.UsageId = ?
         AND vu.Quantity >= ?`,
      [usageId, quantityToDecrement]
    );

    if (!voucherRows.length) {
      throw new Error(`Voucher không tồn tại hoặc không đủ quantity`);
    }

    const currentQuantity = voucherRows[0].Quantity;
    const newQuantity = currentQuantity - quantityToDecrement;

    // Cập nhật quantity và IsUsed
    const [updateResult] = await connection.query(
      `UPDATE VoucherUsage 
       SET Quantity = ?,
           IsUsed = CASE WHEN ? <= 0 THEN 1 ELSE IsUsed END
       WHERE UsageId = ?`,
      [newQuantity, newQuantity, usageId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(`Không thể cập nhật voucher`);
    }

    await connection.commit();

    return {
      usageId,
      oldQuantity: currentQuantity,
      newQuantity,
      isUsed: newQuantity <= 0 ? 1 : 0
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
},

  // Lấy voucher sản phẩm cho một stall cụ thể
  getProductVouchersForStall: async (accountId, stallId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        vu.UsageId,
        vu.Quantity,
        vu.IsUsed,
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
        AND vu.Quantity > 0
        AND v.EndTime >= CURDATE()
        AND v.DiscountType IN ('fixed', 'percent')
        AND (v.CreatedBy = 1 OR s.StallId = ?)
      ORDER BY v.EndTime ASC
      `,
      [accountId, stallId]
    );
    return rows;
  },

  // Lấy voucher toàn đơn (chỉ admin)
  getOrderVouchers: async (accountId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        vu.UsageId,
        vu.Quantity,
        vu.IsUsed,
        v.VoucherId,
        v.VoucherName,
        v.DiscountType,
        v.DiscountValue,
        v.MinOrderValue,
        v.MaxDiscount,
        v.EndTime,
        v.CreatedBy
      FROM VoucherUsage vu
      JOIN Vouchers v ON v.VoucherId = vu.VoucherId
      WHERE vu.AccountId = ?
        AND vu.Quantity > 0
        AND v.EndTime >= CURDATE()
        AND v.CreatedBy = 1 
        AND v.DiscountType IN ('fixed', 'percent', 'ship')
      ORDER BY v.EndTime ASC
      `,
      [accountId]
    );
    return rows;
  },

  validateVoucherForProduct: async (usageId, accountId, productStallId) => {
  const [rows] = await pool.query(
    `SELECT vu.*, v.*, s.StallId 
     FROM VoucherUsage vu
     JOIN Vouchers v ON vu.VoucherId = v.VoucherId
     LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
     WHERE vu.UsageId = ? 
       AND vu.AccountId = ?
       AND vu.Quantity > 0
       AND v.EndTime >= CURDATE()
       AND (
         v.CreatedBy = 1  -- Voucher của admin
         OR s.StallId = ?  -- Hoặc voucher của đúng stall
       )`,
    [usageId, accountId, productStallId]
  );
  return rows[0];
},

validateVoucherForOrder: async (usageId, accountId, orderTotal) => {
  const [rows] = await pool.query(
    `SELECT vu.*, v.* 
     FROM VoucherUsage vu
     JOIN Vouchers v ON vu.VoucherId = v.VoucherId
     WHERE vu.UsageId = ? 
       AND vu.AccountId = ?
       AND vu.Quantity > 0
       AND v.EndTime >= CURDATE()
       AND ? >= v.MinOrderValue`,
    [usageId, accountId, orderTotal]
  );
  return rows[0];
},

decrementVoucherQuantityWithConnection: async (connection, usageId, quantityToDecrement) => {
    try {
      // Kiểm tra voucher tồn tại và có đủ quantity không
      const [voucherRows] = await connection.query(
        `SELECT vu.*, v.* 
         FROM VoucherUsage vu
         JOIN Vouchers v ON vu.VoucherId = v.VoucherId
         WHERE vu.UsageId = ?
           AND vu.Quantity >= ?`,
        [usageId, quantityToDecrement]
      );

      if (!voucherRows.length) {
        throw new Error(`Voucher không tồn tại hoặc không đủ quantity`);
      }

      const currentQuantity = voucherRows[0].Quantity;
      const newQuantity = currentQuantity - quantityToDecrement;

      // Cập nhật quantity và IsUsed
      const [updateResult] = await connection.query(
        `UPDATE VoucherUsage 
         SET Quantity = ?,
             IsUsed = CASE WHEN ? <= 0 THEN 1 ELSE IsUsed END
         WHERE UsageId = ?`,
        [newQuantity, newQuantity, usageId]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error(`Không thể cập nhật voucher`);
      }

      return {
        usageId,
        oldQuantity: currentQuantity,
        newQuantity,
        isUsed: newQuantity <= 0 ? 1 : 0
      };

    } catch (error) {
      throw error;
    }
  },
};

module.exports = VoucherUsage;