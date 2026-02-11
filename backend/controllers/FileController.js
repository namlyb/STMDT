const FileStorage = require("../models/FileStorage");
const path = require("path");
const fs = require("fs");

const FileController = {
  // Upload file
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file được tải lên" });
      }

      const { uploadedBy, chatId } = req.body;

      const fileData = {
        OriginalName: req.file.originalname,
        StoredName: req.file.filename,
        FilePath: req.file.path,
        MimeType: req.file.mimetype,
        FileSize: req.file.size,
        UploadedBy: uploadedBy,
        ChatId: chatId || null,
        IsTemporary: 0, // Không dùng temporary file
      };

      const fileId = await FileStorage.create(fileData);

      res.status(200).json({
        success: true,
        fileId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storedName: req.file.filename,
        downloadUrl: `/api/files/download/${fileId}`,
        viewUrl: `/api/files/${fileId}`,
      });
    } catch (error) {
      console.error("Upload file error:", error);
      
      // Nếu lỗi do kích thước file
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: "File vượt quá 10MB. Vui lòng chọn file nhỏ hơn." 
        });
      }
      
      res.status(500).json({ message: "Lỗi server khi upload file" });
    }
  },

  // Xem file
  getFile: async (req, res) => {
    try {
      const { fileId } = req.params;

      const file = await FileStorage.getById(fileId);
      if (!file) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      const filePath = path.join(__dirname, "../uploads/File", file.StoredName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File không tồn tại trên server" });
      }

      // Thiết lập headers
      res.setHeader("Content-Type", file.MimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.OriginalName)}"`
      );

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Get file error:", error);
      res.status(500).json({ message: "Lỗi server khi lấy file" });
    }
  },

  // Download file
  downloadFile: async (req, res) => {
    try {
      const { fileId } = req.params;

      const file = await FileStorage.getById(fileId);
      if (!file) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      const filePath = path.join(__dirname, "../uploads/File", file.StoredName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File không tồn tại trên server" });
      }

      // Thiết lập headers cho download
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.OriginalName)}"`
      );

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ message: "Lỗi server khi download file" });
    }
  },

  // Lấy danh sách file theo chat
  getFilesByChat: async (req, res) => {
    try {
      const { chatId } = req.params;

      const files = await FileStorage.getByChatId(chatId);

      const formattedFiles = files.map(file => ({
        fileId: file.FileId,
        originalName: file.OriginalName,
        storedName: file.StoredName,
        mimeType: file.MimeType,
        fileSize: file.FileSize,
        uploadedBy: file.UploadedBy,
        createdAt: file.CreatedAt,
        downloadUrl: `/api/files/download/${file.FileId}`,
        viewUrl: `/api/files/${file.FileId}`,
      }));

      res.status(200).json(formattedFiles);
    } catch (error) {
      console.error("Get files by chat error:", error);
      res.status(500).json({ message: "Lỗi server khi lấy danh sách file" });
    }
  },

  // Xóa file
  deleteFile: async (req, res) => {
    try {
      const { fileId } = req.params;
      const { accountId } = req.body;

      const file = await FileStorage.getById(fileId);
      if (!file) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      // Kiểm tra quyền (chỉ người upload mới được xóa)
      if (file.UploadedBy != accountId) {
        return res.status(403).json({ message: "Không có quyền xóa file này" });
      }

      // Xóa file từ disk
      const filePath = path.join(__dirname, "../uploads/File", file.StoredName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Xóa record trong DB
      await FileStorage.deleteById(fileId);

      res.status(200).json({ message: "Xóa file thành công" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ message: "Lỗi server khi xóa file" });
    }
  },
};

module.exports = FileController;