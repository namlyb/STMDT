const { pool } = require("../config/db");

const Message = {
  getByChatId: async (chatId) => {
    const [rows] = await pool.query(
      `SELECT * FROM Messages
       WHERE ChatId=?
       ORDER BY SentAt ASC`,
      [chatId]
    );
    return rows;
  },

  create: async ({ chatId, senderId, content }) => {
    const [result] = await pool.query(
      `INSERT INTO Messages (ChatId, SenderId, Content, SentAt, IsRead)
       VALUES (?, ?, ?, NOW(), 0)`,
      [chatId, senderId, content]
    );

    return {
      MessageId: result.insertId,
      ChatId: chatId,
      SenderId: senderId,
      Content: content
    };
  }
};

module.exports = Message;
