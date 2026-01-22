const { pool } = require("../config/db");

const Voucher = {
  create: async (data) => {
    const {
      VoucherName,
      DiscountType,
      Discount,
      Quantity,
      ConditionText,
      EndTime,
      CreatedBy,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO Vouchers
       (VoucherName, DiscountType, Discount, Quantity, ConditionText, EndTime, CreatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [VoucherName, DiscountType, Discount, Quantity, ConditionText, EndTime, CreatedBy]
    );
    return result.insertId;
  },

  getBySeller: async (sellerId) => {
    const [rows] = await pool.query(
      `
      SELECT 
      v.*,
      (v.Quantity + IFNULL(SUM(vu.Quantity), 0)) AS TotalQuantity,
      IFNULL(SUM(vu.Quantity), 0) AS UsedQuantity
    FROM Vouchers v
    LEFT JOIN VoucherUsage vu 
      ON v.VoucherId = vu.VoucherId
    WHERE v.CreatedBy = ?
      AND v.EndTime >= CURDATE()
    GROUP BY v.VoucherId
      `,
      [sellerId]
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await pool.query(
      `SELECT * FROM Vouchers WHERE VoucherId = ?`,
      [id]
    );
    return rows[0];
  },

  getByNameAndSeller: async (name, sellerId) => {
    const [rows] = await pool.query(
      `SELECT * FROM Vouchers WHERE VoucherName = ? AND CreatedBy = ?`,
      [name, sellerId]
    );
    return rows[0];
  },

  update: async (id, addQuantity, newEndTime) => {
    const [result] = await pool.query(
      `UPDATE Vouchers
     SET Quantity = Quantity + ?,
         EndTime = ?
     WHERE VoucherId = ?`,
      [addQuantity, newEndTime, id]
    );
    return result.affectedRows;
  },

  getByAdmin: async () => {
  const [rows] = await pool.query(
    `
    SELECT 
      v.*,
      s.StallName,
      a.Name AS SellerName,
      (v.Quantity + IFNULL(SUM(vu.Quantity), 0)) AS TotalQuantity,
      IFNULL(SUM(vu.Quantity), 0) AS UsedQuantity
    FROM Vouchers v
    JOIN Stalls s ON s.AccountId = v.CreatedBy
    JOIN Accounts a ON a.AccountId = v.CreatedBy
    LEFT JOIN VoucherUsage vu ON v.VoucherId = vu.VoucherId
    GROUP BY v.VoucherId, s.StallName, a.Name
    ORDER BY v.Endtime DESC
    `
  );
  return rows;
},


};

module.exports = Voucher;
