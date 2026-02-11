const { pool } = require("../config/db");

const FileStorage = {
  // Tạo bản ghi file mới
  create: async (fileData) => {
    const [result] = await pool.query(
      `INSERT INTO FileStorage 
       (OriginalName, StoredName, FilePath, MimeType, FileSize, UploadedBy, ChatId, IsTemporary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileData.OriginalName,
        fileData.StoredName,
        fileData.FilePath,
        fileData.MimeType,
        fileData.FileSize,
        fileData.UploadedBy,
        fileData.ChatId || null,
        fileData.IsTemporary || 0, // Mặc định không phải tạm thời
      ]
    );
    return result.insertId;
  },

  // Lấy thông tin file theo ID
  getById: async (fileId) => {
    const [rows] = await pool.query(
      `SELECT * FROM FileStorage WHERE FileId = ?`,
      [fileId]
    );
    return rows[0];
  },

  // Lấy file theo ChatId
  getByChatId: async (chatId) => {
    const [rows] = await pool.query(
      `SELECT * FROM FileStorage WHERE ChatId = ? ORDER BY CreatedAt DESC`,
      [chatId]
    );
    return rows;
  },

  // Cập nhật ChatId cho file
  updateChatId: async (fileId, chatId) => {
    await pool.query(
      `UPDATE FileStorage SET ChatId = ? WHERE FileId = ?`,
      [chatId, fileId]
    );
  },

  // Xóa file theo ID
  deleteById: async (fileId) => {
    const [result] = await pool.query(
      `DELETE FROM FileStorage WHERE FileId = ?`,
      [fileId]
    );
    return result.affectedRows;
  },
};

module.exports = FileStorage;