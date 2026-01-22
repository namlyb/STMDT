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
      `SELECT * FROM Vouchers WHERE CreatedBy = ?`,
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

};

module.exports = Voucher;
