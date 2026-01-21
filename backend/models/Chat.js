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
        `INSERT INTO Chats (BuyerId, SellerId) VALUES (?, ?)`,
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

  // Danh sách chat của buyer sắp xếp theo tin nhắn mới nhất
  getByBuyer: async (buyerId) => {
  const [rows] = await pool.query(`
    SELECT 
      c.ChatId,
      a.AccountId AS SellerId,
      s.StallName AS SellerName,
      a.Avt,
      m.LastMessage,
      m.LastSendAt,
      IFNULL(u.UnreadCount, 0) AS UnreadCount
    FROM Chats c
    JOIN Accounts a ON c.SellerId = a.AccountId
    JOIN Stalls s ON s.AccountId = a.AccountId
    LEFT JOIN (
      SELECT ChatId, Content AS LastMessage, SendAt AS LastSendAt
      FROM Messages
      WHERE (ChatId, SendAt) IN (
        SELECT ChatId, MAX(SendAt)
        FROM Messages
        GROUP BY ChatId
      )
    ) m ON c.ChatId = m.ChatId
    LEFT JOIN (
      SELECT ChatId, COUNT(*) AS UnreadCount
      FROM Messages
      WHERE IsRead = 0 AND SenderId <> ?
      GROUP BY ChatId
    ) u ON u.ChatId = c.ChatId
    WHERE c.BuyerId = ?
    ORDER BY m.LastSendAt DESC
  `, [buyerId, buyerId]);

  return rows;
},


  getBySeller: async (sellerId) => {
  const [rows] = await pool.query(`
    SELECT 
      c.ChatId,
      a.AccountId AS BuyerId,
      a.Name AS BuyerName,
      a.Avt AS BuyerAvatar,
      m.Content AS LastMessage,
      m.SendAt AS LastSendAt
    FROM Chats c
    JOIN Accounts a ON c.BuyerId = a.AccountId
    LEFT JOIN Messages m
      ON m.ChatId = c.ChatId
      AND m.SendAt = (
        SELECT MAX(SendAt)
        FROM Messages
        WHERE ChatId = c.ChatId
      )
    WHERE c.SellerId = ?
    ORDER BY m.SendAt DESC
  `, [sellerId]);

  return rows;
},

getBySeller: async (sellerId) => {
  const [rows] = await pool.query(`
    SELECT 
      c.ChatId,
      a.AccountId AS BuyerId,
      a.Name AS BuyerName,
      a.Avt AS BuyerAvatar,
      m.LastMessage,
      m.LastSendAt,
      IFNULL(u.UnreadCount, 0) AS UnreadCount
    FROM Chats c
    JOIN Accounts a ON c.BuyerId = a.AccountId

    LEFT JOIN (
      SELECT ChatId, Content AS LastMessage, SendAt AS LastSendAt
      FROM Messages
      WHERE (ChatId, SendAt) IN (
        SELECT ChatId, MAX(SendAt)
        FROM Messages
        GROUP BY ChatId
      )
    ) m ON c.ChatId = m.ChatId

    LEFT JOIN (
      SELECT ChatId, COUNT(*) AS UnreadCount
      FROM Messages
      WHERE IsRead = 0 AND SenderId <> ?
      GROUP BY ChatId
    ) u ON u.ChatId = c.ChatId

    WHERE c.SellerId = ?
    ORDER BY m.LastSendAt DESC
  `, [sellerId, sellerId]);

  return rows;
},


};

module.exports = Chat;
