const { pool } = require("../config/db");

const Chat = {
  // Lấy hoặc tạo chat giữa buyer & seller
  getOrCreate: async (buyerId, sellerId) => {
  // 1. Check trước
  const [rows] = await pool.query(
    `SELECT * FROM Chats WHERE BuyerId=? AND SellerId=?`,
    [buyerId, sellerId]
  );

  if (rows.length > 0) return rows[0];

  try {
    // 2. Tạo mới
    const [result] = await pool.query(
      `INSERT INTO Chats (BuyerId, SellerId)
       VALUES (?, ?)`,
      [buyerId, sellerId]
    );

    return {
      ChatId: result.insertId,
      BuyerId: buyerId,
      SellerId: sellerId
    };

  } catch (err) {
    // 3. Nếu bị trùng UNIQUE → lấy lại chat cũ
    if (err.code === "ER_DUP_ENTRY") {
      const [exist] = await pool.query(
        `SELECT * FROM Chats WHERE BuyerId=? AND SellerId=?`,
        [buyerId, sellerId]
      );
      return exist[0];
    }
    throw err;
  }
},

  // Danh sách chat của buyer
  getByBuyer: async (buyerId) => {
    const [rows] = await pool.query(`
      SELECT 
        c.ChatId,
        a.AccountId AS SellerId,
        s.StallName AS SellerName,
        a.Avt,
        (
          SELECT Content 
          FROM Messages m 
          WHERE m.ChatId = c.ChatId
          ORDER BY m.SentAt DESC 
          LIMIT 1
        ) AS LastMessage
      FROM Chats c
      JOIN Accounts a ON c.SellerId = a.AccountId
      JOIN Stalls s ON s.AccountId = a.AccountId
      WHERE c.BuyerId = ?
      ORDER BY c.ChatId DESC
    `, [buyerId]);

    return rows;
  }
};

module.exports = Chat;
