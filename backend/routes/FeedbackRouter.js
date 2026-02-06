// routes/FeedbackRouter.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const FeedbackController = require("../controllers/FeedbackController");
const upload = require("../middleware/uploadFeedbackImage");

// Tạo feedback
router.post("/", verifyToken, upload.single('Image'), FeedbackController.createFeedback);

// Lấy feedback của user
router.get("/my-feedbacks", verifyToken, FeedbackController.getMyFeedbacks);

// Cập nhật feedback
router.put("/:feedbackId", verifyToken, FeedbackController.updateFeedback);

// Xóa feedback
router.delete("/:feedbackId", verifyToken, FeedbackController.deleteFeedback);

module.exports = router;