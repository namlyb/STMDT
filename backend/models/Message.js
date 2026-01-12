const { sql } = require("../config/db");

module.exports = {
  send: async (chatId, senderId, content) => {
    await sql.query`
      INSERT INTO Messages (ChatId, SenderId, Content, SendAt)
      VALUES (${chatId}, ${senderId}, ${content}, GETDATE())
    `;
  }
};
