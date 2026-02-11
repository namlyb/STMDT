const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục nếu chưa tồn tại
const fileDir = path.join(__dirname, "../uploads/File");
if (!fs.existsSync(fileDir)) {
  fs.mkdirSync(fileDir, { recursive: true });
}

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fileDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  },
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Chấp nhận tất cả các loại file
  cb(null, true);
};

// Cấu hình upload với limit 10MB
const uploadFile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

module.exports = uploadFile;