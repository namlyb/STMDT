const { pool } = require("../config/db");

const Voucher = {
  create: async (data) => {
    const {
      VoucherName,
      DiscountType,
      DiscountValue,
      MinOrderValue,
      MaxDiscount,
      Quantity,
      EndTime,
      CreatedBy,
    } = data;

    const [result] = await pool.query(
      `
      INSERT INTO Vouchers
      (VoucherName, DiscountType, DiscountValue, MinOrderValue, MaxDiscount, Quantity, EndTime, CreatedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        VoucherName,
        DiscountType,
        DiscountValue,
        MinOrderValue,
        MaxDiscount,
        Quantity,
        EndTime,
        CreatedBy,
      ]
    );

    return result.insertId;
  },

  getBySeller: async (sellerId) => {
    const [rows] = await pool.query(
      `
      SELECT
        v.*,
        s.StallName,
        (v.Quantity + IFNULL(SUM(vu.Quantity), 0) + IFNULL(SUM(vu.IsUsed), 0)) AS TotalQuantity,
        (IFNULL(SUM(vu.Quantity), 0) + IFNULL(SUM(vu.IsUsed), 0)) AS UsedQuantity,
        v.Quantity AS RemainingQuantity
      FROM Vouchers v
      LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
      LEFT JOIN VoucherUsage vu ON v.VoucherId = vu.VoucherId
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
    const [rows] = await pool.query(`
      SELECT
        v.*,
        s.StallName,
        CASE 
          WHEN v.CreatedBy = 1 THEN 'Admin'
          ELSE a.Name
        END AS SellerName,
        -- Tổng phiếu = Voucher.Quantity (chưa nhận) + VoucherUsage.Quantity (đã nhận chưa dùng) + VoucherUsage.IsUsed (đã dùng)
        (v.Quantity + 
         IFNULL(SUM(vu.Quantity), 0) + 
         IFNULL(SUM(vu.IsUsed), 0)) AS TotalQuantity,
        -- Phiếu đã nhận = VoucherUsage.Quantity (đã nhận chưa dùng) + VoucherUsage.IsUsed (đã dùng)
        (IFNULL(SUM(vu.Quantity), 0) + 
         IFNULL(SUM(vu.IsUsed), 0)) AS UsedQuantity,
        -- Số phiếu còn lại = Voucher.Quantity (chưa nhận)
        v.Quantity AS RemainingQuantity
      FROM Vouchers v
      LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
      LEFT JOIN Accounts a ON a.AccountId = v.CreatedBy
      LEFT JOIN VoucherUsage vu ON v.VoucherId = vu.VoucherId
      GROUP BY v.VoucherId
      ORDER BY v.EndTime DESC
    `);
    return rows;
  },

  getRandom: async (limit, accountId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        v.VoucherId,
        v.VoucherName,
        v.DiscountType,
        v.DiscountValue,
        v.MinOrderValue,
        v.MaxDiscount,
        v.Quantity,
        v.EndTime,
        s.StallName,
        CASE WHEN vu.UsageId IS NOT NULL THEN 1 ELSE 0 END AS isReceived,
        CASE WHEN v.Quantity <= 0 THEN 1 ELSE 0 END AS isOut
      FROM Vouchers v
      LEFT JOIN Stalls s ON s.AccountId = v.CreatedBy
      LEFT JOIN VoucherUsage vu 
        ON vu.VoucherId = v.VoucherId
       AND vu.AccountId = ?
      WHERE v.EndTime >= CURDATE()
      AND v.Quantity > 0
      ORDER BY RAND()
      LIMIT ?
      `,
      [accountId, limit]
    );
    return rows;
  },
};

module.exports = Voucher;