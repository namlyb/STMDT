const { sql } = require("../config/db");

module.exports = {
  create: async (data) => {
    const { accountId, orderDetailId, score, content, image } = data;

    await sql.query`
      INSERT INTO Feedbacks
      (AccountId, OrderDetailId, Score, Content, Image, CreatedAt)
      VALUES
      (${accountId}, ${orderDetailId}, ${score},
       ${content}, ${image}, GETDATE())
    `;
  }
};
