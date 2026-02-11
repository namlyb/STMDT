const Message = require("../models/Message");
const FileStorage = require("../models/FileStorage");

const MessageController = {
  // ================= GET MESSAGES =================
  getMessages: async (req, res) => {
    try {
      const { chatId } = req.query;

      if (!chatId) {
        return res.status(400).json({ message: "Thiếu chatId" });
      }

      const messages = await Message.getByChatId(chatId);
      
      // Loại bỏ tin nhắn trùng lặp (dựa trên MessageId)
      const seen = new Set();
      const uniqueMessages = messages.filter(msg => {
        if (seen.has(msg.MessageId)) {
          return false;
        }
        seen.add(msg.MessageId);
        return true;
      });

      res.status(200).json(uniqueMessages);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi lấy tin nhắn" });
    }
  },

  // ================= SEND MESSAGE =================
  sendMessage: async (req, res) => {
    try {
      const { chatId, senderId, content } = req.body;

      if (!chatId || !senderId || !content) {
        return res.status(400).json({ message: "Thiếu dữ liệu" });
      }

      // Kiểm tra xem tin nhắn trùng đã tồn tại chưa (trong 2 giây gần nhất)
      const recentMessages = await Message.getRecentByChatId(chatId, 2);
      const duplicate = recentMessages.find(msg => 
        msg.SenderId == senderId && 
        msg.Content === content
      );

      if (duplicate) {
        return res.status(200).json(duplicate); // Trả về tin nhắn đã có
      }

      const msg = await Message.create({ chatId, senderId, content });
      const io = req.app.get("io");
      io.to(`chat_${chatId}`).emit("newMessage", msg);
      res.status(201).json(msg);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Gửi thất bại" });
    }
  },

  // ================= SEND FILE MESSAGE =================
  sendFileMessage: async (req, res) => {
    try {
      const { chatId, senderId, content, fileId, messageType = 'file' } = req.body;

      if (!chatId || !senderId || !fileId) {
        return res.status(400).json({ message: "Thiếu dữ liệu" });
      }

      // Lấy thông tin file
      const file = await FileStorage.getById(fileId);
      if (!file) {
        return res.status(404).json({ message: "File không tồn tại" });
      }

      // Cập nhật file với ChatId
      await FileStorage.updateChatId(fileId, chatId);

      // Xác định MessageType dựa trên MIME type
      let finalMessageType = messageType;
      if (file.MimeType.startsWith('image/')) {
        finalMessageType = 'image';
      } else if (file.MimeType.startsWith('audio/')) {
        finalMessageType = 'audio';
      } else if (file.MimeType.startsWith('video/')) {
        finalMessageType = 'video';
      }

      // Kiểm tra trùng lặp tin nhắn file (trong 2 giây gần nhất)
      const recentMessages = await Message.getRecentByChatId(chatId, 2);
      const duplicate = recentMessages.find(msg => 
        msg.SenderId == senderId && 
        msg.FileURL === `/api/files/${fileId}`
      );

      if (duplicate) {
        return res.status(200).json(duplicate);
      }

      // Tạo tin nhắn
      const msg = await Message.createWithFile({
        chatId,
        senderId,
        content: content || file.OriginalName,
        messageType: finalMessageType,
        fileURL: `/api/files/${fileId}`,
        fileName: file.OriginalName,
        fileSize: file.FileSize,
        fileMimeType: file.MimeType,
      });

      // Gửi qua socket
      const io = req.app.get("io");
      io.to(`chat_${chatId}`).emit("newMessage", msg);
      
      res.status(201).json(msg);

    } catch (err) {
      console.error("Send file message error:", err);
      res.status(500).json({ message: "Gửi file thất bại", error: err.message });
    }
  },

  // POST /api/messages/read
  markRead: async (req, res) => {
    try {
      const { chatId, readerId } = req.body;
      if (!chatId || !readerId) return res.status(400).json({ message: "Thiếu dữ liệu" });

      await Message.markAsRead(chatId, readerId);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update IsRead thất bại" });
    }
  },
};

module.exports = MessageController;