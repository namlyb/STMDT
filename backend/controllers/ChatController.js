const Chat = require("../models/Chat");

const ChatController = {

  // ================= GET CHAT LIST (BUYER) =================
  getBuyerChats: async (req, res) => {
    try {
      const { buyerId } = req.query;
      if (!buyerId) {
        return res.status(400).json({ message: "Thiếu buyerId" });
      }

      const chats = await Chat.getByBuyer(buyerId);
      res.status(200).json(chats);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lấy danh sách chat thất bại" });
    }
  },

  // ================= GET OR CREATE CHAT =================
  getOrCreateChat: async (req, res) => {
    try {
      const { buyerId, sellerId } = req.body;

      if (!buyerId || !sellerId) {
        return res.status(400).json({ message: "Thiếu buyerId hoặc sellerId" });
      }

      const chat = await Chat.getOrCreate(buyerId, sellerId);
      res.status(200).json(chat);

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Tạo chat thất bại" });
    }
  }
};

module.exports = ChatController;
