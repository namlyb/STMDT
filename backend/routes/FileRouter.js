const express = require("express");
const router = express.Router();
const FileController = require("../controllers/FileController");
const uploadFile = require("../middleware/uploadFile");
const { verifyToken } = require("../middleware/auth");

// Upload file
router.post(
  "/upload",
  verifyToken,
  uploadFile.single("file"),
  FileController.uploadFile
);

// Xem file (inline)
router.get("/:fileId", FileController.getFile);

// Download file
router.get("/download/:fileId", FileController.downloadFile);

// Lấy danh sách file theo chat
router.get("/chat/:chatId", verifyToken, FileController.getFilesByChat);

// Xóa file
router.delete("/:fileId", verifyToken, FileController.deleteFile);

module.exports = router;