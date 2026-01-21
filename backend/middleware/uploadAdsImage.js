const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/AdsImage");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `ads_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadAdsImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Chỉ được upload ảnh"));
    }
    cb(null, true);
  },
});

module.exports = uploadAdsImage;
