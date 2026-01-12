const { sql } = require("../config/db");

module.exports = {
  create: async (buyerId, sellerId) => {
    await sql.query`
      INSERT INTO Chats (BuyerId, SellerId, CreateAt)
      VALUES (${buyerId}, ${sellerId}, GETDATE())
    `;
  }
};
