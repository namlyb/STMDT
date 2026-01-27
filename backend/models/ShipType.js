const {pool} = require("../config/db");

const ShipType = {
  getAll: async () => {
    const sql = `
      SELECT
        st.ShipTypeId,
        st.Content,
        st.ShipFee
      FROM ShipType st
    `;

    const [rows] = await pool.query(sql);
    return rows;
  }
};

module.exports = ShipType;
