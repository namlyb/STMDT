const express = require("express");
const router = express.Router();
const CallController = require("../controllers/CallController");
const { verifyToken } = require("../middleware/auth");

// Tạo cuộc gọi mới
router.post("/initiate", verifyToken, CallController.initiateCall);
// Kết thúc cuộc gọi
router.post("/end", verifyToken, CallController.endCall);
// Gửi tín hiệu WebRTC (offer, answer, candidate)
router.post("/signal", verifyToken, CallController.sendSignal);
// Lấy thông tin cuộc gọi
router.get("/:callId", verifyToken, CallController.getCall);
// Lấy tín hiệu của cuộc gọi
router.get("/:callId/signals", verifyToken, CallController.getCallSignals);
// Cập nhật trạng thái cuộc gọi
router.put("/status", verifyToken, CallController.updateCallStatus);
router.post("/accept", verifyToken, CallController.acceptCall);
router.post("/reject", verifyToken, CallController.rejectCall);
module.exports = router;