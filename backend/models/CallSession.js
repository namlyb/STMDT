const { pool } = require("../config/db");

const CallSession = {
  // Tạo cuộc gọi mới
create: async (callData) => {
  const [result] = await pool.query(
    `INSERT INTO CallSessions 
     (ChatId, CallerId, ReceiverId, Type, SessionId, Status, StartTime, CreatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    [
      callData.ChatId,
      callData.CallerId,
      callData.ReceiverId,
      callData.Type,
      callData.SessionId,
      callData.Status
    ]
  );
  return result.insertId;
},

  // Lấy thông tin cuộc gọi theo ID
  getById: async (callId) => {
    const [rows] = await pool.query(
      `SELECT cs.*, 
              c1.Name as CallerName, c1.Avt as CallerAvatar,
              c2.Name as ReceiverName, c2.Avt as ReceiverAvatar
       FROM CallSessions cs
       JOIN Accounts c1 ON cs.CallerId = c1.AccountId
       JOIN Accounts c2 ON cs.ReceiverId = c2.AccountId
       WHERE cs.CallId = ?`,
      [callId]
    );
    return rows[0];
  },

  // Cập nhật trạng thái cuộc gọi
  updateStatus: async (callId, status) => {
    await pool.query(
      `UPDATE CallSessions SET Status = ? WHERE CallId = ?`,
      [status, callId]
    );
  },

  // Kết thúc cuộc gọi
  endCall: async (callId, duration) => {
    await pool.query(
      `UPDATE CallSessions 
       SET Status = 'ended', EndTime = NOW(3), Duration = ? 
       WHERE CallId = ?`,
      [duration, callId]
    );
  },

  // Lấy cuộc gọi theo Session ID
  getBySessionId: async (sessionId) => {
    const [rows] = await pool.query(
      `SELECT * FROM CallSessions WHERE SessionId = ?`,
      [sessionId]
    );
    return rows[0];
  },

  // Lấy cuộc gọi đang active của chat
  getActiveCallByChat: async (chatId) => {
    const [rows] = await pool.query(
      `SELECT * FROM CallSessions 
       WHERE ChatId = ? AND Status IN ('initiated', 'ringing', 'active') 
       LIMIT 1`,
      [chatId]
    );
    return rows[0];
  },

  // Lấy lịch sử cuộc gọi của user
  getCallHistory: async (accountId, limit = 20) => {
    const [rows] = await pool.query(
      `SELECT cs.*, 
              CASE 
                WHEN cs.CallerId = ? THEN c2.Name
                ELSE c1.Name
              END as OtherPartyName,
              CASE 
                WHEN cs.CallerId = ? THEN c2.Avt
                ELSE c1.Avt
              END as OtherPartyAvatar
       FROM CallSessions cs
       JOIN Accounts c1 ON cs.CallerId = c1.AccountId
       JOIN Accounts c2 ON cs.ReceiverId = c2.AccountId
       WHERE (cs.CallerId = ? OR cs.ReceiverId = ?)
         AND cs.Status = 'ended'
       ORDER BY cs.EndTime DESC
       LIMIT ?`,
      [accountId, accountId, accountId, accountId, limit]
    );
    return rows;
  }
};

module.exports = CallSession;