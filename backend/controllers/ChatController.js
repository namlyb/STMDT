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
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy chat buyer" });
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
  },

  getSellerChats: async (req, res) => {
  try {
    const { sellerId } = req.query;
    if (!sellerId) {
      return res.status(400).json({ message: "Thiếu sellerId" });
    }

    const chats = await Chat.getBySeller(sellerId);
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy chat seller" });
  }
},

};

module.exports = ChatController;
