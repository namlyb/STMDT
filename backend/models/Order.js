const { sql } = require("../config/db");

module.exports = {
  create: async (data) => {
    const {
      accountId,
      shipmentId,
      shipperId,
      feeId,
      adressId,
      orderDate
    } = data;

    await sql.query`
      INSERT INTO Orders
      (AccountId, ShipmentId, ShipperId, FeeId, AdressId, OrderDate)
      VALUES
      (${accountId}, ${shipmentId}, ${shipperId},
       ${feeId}, ${adressId}, ${orderDate})
    `;
  }
};
