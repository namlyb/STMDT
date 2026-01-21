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

  create: async ({ chatId, senderId, content }) => {
    const [result] = await pool.query(
      `INSERT INTO Messages (ChatId, SenderId, Content, SendAt, IsRead)
       VALUES (?, ?, ?, NOW(3), 0)`,
      [chatId, senderId, content]
    );

    return {
      MessageId: result.insertId,
      ChatId: chatId,
      SenderId: senderId,
      Content: content,
      SendAt: new Date().toISOString().slice(0, 23).replace('T', ' ')
    };
  },

  markAsRead: async (chatId, readerId) => {
  await pool.query(
    `UPDATE Messages
     SET IsRead = 1
     WHERE ChatId = ? AND SenderId <> ? AND IsRead = 0`,
    [chatId, readerId]
  );
},

};

module.exports = Message;
