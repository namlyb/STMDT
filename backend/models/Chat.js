const { pool } = require("../config/db");

const Chat = {
  // Lấy hoặc tạo chat giữa buyer và seller (phân biệt role)
  getOrCreate: async (user1Id, user2Id) => {
    try {
      // 1. Kiểm tra xem đã có chat chưa (không phân biệt thứ tự)
      const [rows] = await pool.query(
        `SELECT * FROM Chats 
         WHERE (BuyerId = ? AND SellerId = ?) 
            OR (BuyerId = ? AND SellerId = ?)`,
        [user1Id, user2Id, user2Id, user1Id]
      );
      if (rows.length > 0) return rows[0];

      // 2. Xác định ai là buyer, ai là seller dựa vào RoleId (2 = buyer, 3 = seller)
      const [accounts] = await pool.query(
        `SELECT AccountId, RoleId FROM Accounts WHERE AccountId IN (?, ?)`,
        [user1Id, user2Id]
      );
      if (accounts.length !== 2) throw new Error("Không tìm thấy tài khoản");

      const acc1 = accounts.find(a => a.AccountId == user1Id);
      const acc2 = accounts.find(a => a.AccountId == user2Id);
      let buyerId, sellerId;

      if (acc1.RoleId == 2 && acc2.RoleId == 3) {
        buyerId = user1Id; sellerId = user2Id;
      } else if (acc1.RoleId == 3 && acc2.RoleId == 2) {
        buyerId = user2Id; sellerId = user1Id;
      } else {
        throw new Error("Chat chỉ được phép giữa Buyer và Seller");
      }

      // 3. Tạo chat mới
      const [result] = await pool.query(
        `INSERT INTO Chats (BuyerId, SellerId) VALUES (?, ?)`,
        [buyerId, sellerId]
      );
      return {
        ChatId: result.insertId,
        BuyerId: buyerId,
        SellerId: sellerId,
        CreatedAt: new Date()
      };
    } catch (err) {
      // Xử lý race condition nếu bị duplicate entry
      if (err.code === "ER_DUP_ENTRY") {
        const [exist] = await pool.query(
          `SELECT * FROM Chats 
           WHERE (BuyerId = ? AND SellerId = ?) 
              OR (BuyerId = ? AND SellerId = ?)`,
          [user1Id, user2Id, user2Id, user1Id]
        );
        if (exist.length > 0) return exist[0];
      }
      throw err;
    }
  },

  // Danh sách chat của buyer (kèm thông tin seller, stall, tin nhắn cuối, unread)
  getByBuyer: async (buyerId) => {
    const [rows] = await pool.query(`
      SELECT 
        c.ChatId,
        a.AccountId AS SellerId,
        s.StallName AS SellerName,
        a.Avt AS SellerAvatar,
        m.LastMessage,
        m.LastSendAt,
        IFNULL(u.UnreadCount, 0) AS UnreadCount
      FROM Chats c
      JOIN Accounts a ON c.SellerId = a.AccountId
      JOIN Stalls s ON s.AccountId = a.AccountId
      LEFT JOIN (
        SELECT ChatId, Content AS LastMessage, SendAt AS LastSendAt
        FROM Messages m1
        WHERE SendAt = (
          SELECT MAX(SendAt) FROM Messages m2 WHERE m2.ChatId = m1.ChatId
        )
      ) m ON c.ChatId = m.ChatId
      LEFT JOIN (
        SELECT ChatId, COUNT(*) AS UnreadCount
        FROM Messages
        WHERE IsRead = 0 AND SenderId != ?
        GROUP BY ChatId
      ) u ON u.ChatId = c.ChatId
      WHERE c.BuyerId = ?
      ORDER BY m.LastSendAt DESC
    `, [buyerId, buyerId]);
    return rows;
  },

  // Danh sách chat của seller (kèm thông tin buyer, tin nhắn cuối, unread)
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
        FROM Messages m1
        WHERE SendAt = (
          SELECT MAX(SendAt) FROM Messages m2 WHERE m2.ChatId = m1.ChatId
        )
      ) m ON c.ChatId = m.ChatId
      LEFT JOIN (
        SELECT ChatId, COUNT(*) AS UnreadCount
        FROM Messages
        WHERE IsRead = 0 AND SenderId != ?
        GROUP BY ChatId
      ) u ON u.ChatId = c.ChatId
      WHERE c.SellerId = ?
      ORDER BY m.LastSendAt DESC
    `, [sellerId, sellerId]);
    return rows;
  }
};

module.exports = Chat;