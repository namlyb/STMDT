const Chat = require("../models/Chat");
const Message = require("../models/Message");

const MessageController = {

  // ================= GET MESSAGES =================
  getMessages: async (req, res) => {
    try {
      const { chatId } = req.query;

      if (!chatId) {
        return res.status(400).json({ message: "Thiếu chatId" });
      }

      const messages = await Message.getByChatId(chatId);
      res.status(200).json(messages);

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

      const msg = await Message.create({ chatId, senderId, content });
      res.status(201).json(msg);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Gửi thất bại" });
    }
  }
};

module.exports = MessageController;
