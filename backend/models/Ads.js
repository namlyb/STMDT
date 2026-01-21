const { pool } = require("../config/db");

const Ads = {
  // Lấy quảng cáo mới nhất theo StyleID
  getLatestByStyleId: async (styleId) => {
    const [rows] = await pool.query(`
      SELECT *
            FROM Ads
            WHERE StyleID = ?
            And Status = 1
            ORDER BY AdsId DESC
            LIMIT 1
    `, [styleId]);
    return rows[0] || null;
  },

  getAll: async () => {
    const [rows] = await pool.query(`
      SELECT a.*, s.StyleName
      FROM Ads a
      LEFT JOIN StyleAds s ON a.StyleID = s.StyleID
      ORDER BY a.AdsId DESC
      `);
    return rows;
  },


  // Lấy theo ID
  getById: async (id) => {
    const [rows] = await pool.query(`SELECT * FROM Ads WHERE AdsId = ?`, [id]);
    return rows[0] || null;
  },

  updateStatus: async (id, status) => {
    await pool.query(
      `UPDATE Ads SET Status = ? WHERE AdsId = ?`,
      [status, id]
    );
  },

  getByStyleId: async (styleId) => {
  const [rows] = await pool.query(
    `SELECT * FROM Ads WHERE StyleID = ? LIMIT 1`,
    [styleId]
  );
  return rows[0] || null;
},

  updateStyle: async (id, styleId) => {
    await pool.query(
      `UPDATE Ads SET StyleID = ? WHERE AdsId = ?`,
      [styleId, id]
    );
  },

  updateStatusAndStyle: async (id, status, styleId) => {
  await pool.query(
    `UPDATE Ads SET Status = ?, StyleID = ? WHERE AdsId = ?`,
    [status, styleId, id]
  );
},

};

module.exports = Ads;
