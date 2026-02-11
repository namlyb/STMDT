const { pool } = require("../config/db");

const Message = {
  getByChatId: async (chatId) => {
    const [rows] = await pool.query(
      `SELECT * FROM Messages
       WHERE ChatId=?
       ORDER BY SendAt ASC`,
      [chatId]
    );
    return rows;
  },

  // THÊM HÀM NÀY - lấy tin nhắn gần đây
  getRecentByChatId: async (chatId, seconds = 2) => {
    const [rows] = await pool.query(
      `SELECT * FROM Messages 
       WHERE ChatId = ? 
       AND SendAt >= DATE_SUB(NOW(3), INTERVAL ? SECOND)
       ORDER BY SendAt DESC`,
      [chatId, seconds]
    );
    return rows;
  },

  create: async ({ chatId, senderId, content }) => {
    const [result] = await pool.query(
      `INSERT INTO Messages (ChatId, SenderId, Content, SendAt, IsRead)
       VALUES (?, ?, ?, NOW(3), 0)`,
      [chatId, senderId, content]
    );

    // Lấy lại tin nhắn vừa tạo
    const [newMsg] = await pool.query(
      `SELECT * FROM Messages WHERE MessageId = ?`,
      [result.insertId]
    );

    return newMsg[0];
  },

  markAsRead: async (chatId, readerId) => {
    await pool.query(
      `UPDATE Messages
       SET IsRead = 1
       WHERE ChatId = ? AND SenderId <> ? AND IsRead = 0`,
      [chatId, readerId]
    );
  },

  createWithFile: async ({ chatId, senderId, content, messageType, fileURL, fileName, fileSize, fileMimeType, thumbnailURL = null, duration = 0 }) => {
    const [result] = await pool.query(
      `INSERT INTO Messages 
       (ChatId, SenderId, Content, MessageType, FileURL, FileName, FileSize, FileMimeType, ThumbnailURL, Duration, SendAt, IsRead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), 0)`,
      [chatId, senderId, content, messageType, fileURL, fileName, fileSize, fileMimeType, thumbnailURL, duration]
    );

    const [newMessage] = await pool.query(
      `SELECT * FROM Messages WHERE MessageId = ?`,
      [result.insertId]
    );

    return newMessage[0];
  },

  // Lấy tin nhắn với thông tin file
  getMessagesWithFiles: async (chatId) => {
    const [rows] = await pool.query(
      `SELECT m.*, 
              f.OriginalName, f.MimeType, f.FileSize as ActualFileSize,
              a.Name as SenderName, a.Avt as SenderAvatar
       FROM Messages m
       LEFT JOIN FileStorage f ON m.FileURL LIKE CONCAT('%', f.FileId)
       LEFT JOIN Accounts a ON m.SenderId = a.AccountId
       WHERE m.ChatId = ?
       ORDER BY m.SendAt ASC`,
      [chatId]
    );
    return rows;
  },
};

module.exports = Message;