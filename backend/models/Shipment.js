const { sql } = require("../config/db");

module.exports = {
  create: async (data) => {
    const {
      shipperId,
      trackingCode,
      shippingFee,
      createdAt
    } = data;

    await sql.query`
      INSERT INTO Shipments
      (ShipperId, TrackingCode, ShippingFee, CreatedAt)
      VALUES
      (${shipperId}, ${trackingCode}, ${shippingFee}, ${createdAt})
    `;
  },

  getById: async (shipmentId) => {
    const result = await sql.query`
      SELECT * FROM Shipments
      WHERE ShipmentId = ${shipmentId}
    `;
    return result.recordset[0];
  }
};
