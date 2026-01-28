const { pool } = require("../config/db");

const ShipType = {
  getAll: async () => {
    const [rows] = await pool.query(
      `SELECT * FROM ShipType ORDER BY ShipTypeId`
    );
    return rows;
  }
};

module.exports = ShipType;