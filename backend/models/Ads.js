const { pool } = require("../config/db");

const Ads = {
    // Lấy quảng cáo mới nhất theo StyleID
    getLatestByStyleId: async (styleId) => {
    const [rows] = await pool.query(`
      SELECT *
            FROM Ads
            WHERE StyleID = ?
            ORDER BY AdsId DESC
            LIMIT 1
    `, [styleId]);
    return rows[0] || null;
  },
};

module.exports = Ads;
