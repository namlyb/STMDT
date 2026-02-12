const { pool } = require("../config/db");

const CallSignal = {
  // Lưu tín hiệu WebRTC
  create: async (signalData) => {
    const [result] = await pool.query(
      `INSERT INTO CallSignals 
       (CallId, SenderId, SignalType, SignalData, CreatedAt) 
       VALUES (?, ?, ?, ?, NOW(3))`,
      [
        signalData.CallId,
        signalData.SenderId,
        signalData.SignalType,
        JSON.stringify(signalData.SignalData)
      ]
    );
    return result.insertId;
  },

  // Lấy tín hiệu theo Call ID
  getByCallId: async (callId) => {
    const [rows] = await pool.query(
      `SELECT * FROM CallSignals 
       WHERE CallId = ? 
       ORDER BY CreatedAt ASC`,
      [callId]
    );
    return rows;
  },

  // Xóa tín hiệu cũ (cleanup)
  deleteOldSignals: async (callId) => {
    await pool.query(
      `DELETE FROM CallSignals 
       WHERE CallId = ? AND CreatedAt < DATE_SUB(NOW(3), INTERVAL 1 HOUR)`,
      [callId]
    );
  }
};

module.exports = CallSignal;