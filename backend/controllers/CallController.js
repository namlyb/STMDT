const CallSession = require("../models/CallSession");
const CallSignal = require("../models/CallSignal");
const Chat = require("../models/Chat");

const CallController = {
  // Khởi tạo cuộc gọi
  initiateCall: async (req, res) => {
    try {
      const { chatId, callerId, receiverId, type } = req.body;

      console.log("Initiate call request:", { chatId, callerId, receiverId, type });

      if (!callerId || !receiverId) {
        return res.status(400).json({
          message: "Thiếu thông tin người tham gia cuộc gọi",
          details: {
            callerId: callerId ? "Có" : "Không có",
            receiverId: receiverId ? "Có" : "Không có"
          }
        });
      }

      if (callerId === receiverId) {
        return res.status(400).json({
          message: "Không thể gọi cho chính mình"
        });
      }

      let targetChatId = chatId;

      if (!targetChatId) {
        const chat = await Chat.getOrCreate(callerId, receiverId);
        if (!chat) {
          return res.status(404).json({ message: "Không thể tìm hoặc tạo chat" });
        }
        targetChatId = chat.ChatId;
      }

      const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const callData = {
        ChatId: targetChatId,
        CallerId: callerId,
        ReceiverId: receiverId,
        Type: type || 'audio',
        SessionId: sessionId,
        Status: 'ringing',
      };

      const callId = await CallSession.create(callData);
      const call = await CallSession.getById(callId);

      if (!call) {
        return res.status(500).json({ message: "Không thể tạo cuộc gọi" });
      }

      console.log("Call created successfully:", call);

      const io = req.app.get("io");

      // Gửi đến room của chat
      io.to(`chat_${targetChatId}`).emit("callInitiated", call);
      io.to(`chat_${targetChatId}`).emit("incomingCall", call); // ✅ BỔ SUNG

      // Gửi trực tiếp đến receiver (phòng cá nhân)
      io.to(`user_${receiverId}`).emit("incomingCall", call);

      // Tham gia room cho cuộc gọi
      io.to(`chat_${targetChatId}`).socketsJoin(`call_${callId}`);

      res.status(201).json(call);
    } catch (error) {
      console.error("Initiate call error:", error);
      res.status(500).json({
        message: "Lỗi khởi tạo cuộc gọi",
        error: error.message
      });
    }
  },

  // Kết thúc cuộc gọi
  endCall: async (req, res) => {
    try {
      const { callId, duration } = req.body;

      const call = await CallSession.getById(callId);
      if (!call) {
        return res.status(404).json({ message: "Cuộc gọi không tồn tại" });
      }

      await CallSession.endCall(callId, duration);

      const updatedCall = await CallSession.getById(callId);

      const io = req.app.get("io");
      io.to(`call_${callId}`).emit("callEnded", updatedCall);
      io.to(`chat_${call.ChatId}`).emit("callEnded", updatedCall); // gửi thêm vào chat room

      io.to(`call_${callId}`).socketsLeave(`call_${callId}`);

      res.json({ success: true, call: updatedCall });
    } catch (error) {
      console.error("End call error:", error);
      res.status(500).json({ message: "Lỗi kết thúc cuộc gọi" });
    }
  },

  acceptCall: async (req, res) => {
    try {
      const { callId } = req.body;

      const call = await CallSession.getById(callId);
      if (!call) {
        return res.status(404).json({ message: "Cuộc gọi không tồn tại" });
      }

      await CallSession.updateStatus(callId, "active");
      const updatedCall = await CallSession.getById(callId);

      const io = req.app.get("io");
      io.to(`call_${callId}`).emit("callAccepted", updatedCall);
      io.to(`chat_${call.ChatId}`).emit("callStatusUpdated", updatedCall);
      io.to(`chat_${call.ChatId}`).emit("callAccepted", updatedCall); // ✅ bổ sung

      res.json(updatedCall);
    } catch (error) {
      console.error("Accept call error:", error);
      res.status(500).json({ message: "Lỗi chấp nhận cuộc gọi" });
    }
  },

  // Gửi tín hiệu WebRTC
  sendSignal: async (req, res) => {
    try {
      const { callId, senderId, signalType, signalData } = req.body;

      const signalId = await CallSignal.create({
        CallId: callId,
        SenderId: senderId,
        SignalType: signalType,
        SignalData: signalData
      });

      const io = req.app.get("io");
      io.to(`call_${callId}`).emit("signal", {
        signalId,
        callId,
        senderId,
        signalType,
        signalData,
        createdAt: new Date()
      });

      res.json({ success: true, signalId });
    } catch (error) {
      console.error("Send signal error:", error);
      res.status(500).json({ message: "Lỗi gửi tín hiệu" });
    }
  },

  // Lấy thông tin cuộc gọi
  getCall: async (req, res) => {
    try {
      const { callId } = req.params;
      const call = await CallSession.getById(callId);

      if (!call) {
        return res.status(404).json({ message: "Cuộc gọi không tồn tại" });
      }

      res.json(call);
    } catch (error) {
      console.error("Get call error:", error);
      res.status(500).json({ message: "Lỗi lấy thông tin cuộc gọi" });
    }
  },

  // Lấy tất cả tín hiệu của cuộc gọi
  getCallSignals: async (req, res) => {
    try {
      const { callId } = req.params;
      const signals = await CallSignal.getByCallId(callId);

      res.json(signals);
    } catch (error) {
      console.error("Get call signals error:", error);
      res.status(500).json({ message: "Lỗi lấy tín hiệu cuộc gọi" });
    }
  },

  // Cập nhật trạng thái cuộc gọi
  updateCallStatus: async (req, res) => {
    try {
      const { callId, status } = req.body;

      const call = await CallSession.getById(callId);
      if (!call) {
        return res.status(404).json({ message: "Cuộc gọi không tồn tại" });
      }

      await CallSession.updateStatus(callId, status);
      const updatedCall = await CallSession.getById(callId);

      const io = req.app.get("io");
      io.to(`call_${callId}`).emit("callStatusUpdated", updatedCall);
      io.to(`chat_${call.ChatId}`).emit("callStatusUpdated", updatedCall);

      res.json(updatedCall);
    } catch (error) {
      console.error("Update call status error:", error);
      res.status(500).json({ message: "Lỗi cập nhật trạng thái cuộc gọi" });
    }
  }
};

module.exports = CallController;