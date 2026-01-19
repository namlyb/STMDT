import { useEffect, useState, useRef } from "react";
import ChatSidebar from "../../components/ChatBox/ChatSidebar";
import ChatContent from "../../components/ChatBox/ChatContent";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";

export default function BuyerChat({ sellerId, onClose }) {
  const account = JSON.parse(sessionStorage.getItem("account"));
  const buyerId = account?.AccountId;
  const AVATAR = `${API_URL}/uploads/AccountAvatar`;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [minimized, setMinimized] = useState(false); // trạng thái thu nhỏ

  useEffect(() => {
    if (!buyerId) return;

    const init = async () => {
      if (sellerId) {
        await axios.post("/chats", { buyerId, sellerId });
      }

      const chatRes = await axios.get("/chats", { params: { buyerId } });
      const formatted = chatRes.data.map(c => ({
        ...c,
        Avt: c.Avt ? `${AVATAR}/${c.Avt}` : `${AVATAR}/avtDf.png`
      }));

      formatted.sort((a, b) => new Date(b.LastSentAt || 0) - new Date(a.LastSentAt || 0));
      setChats(formatted);

      if (sellerId) {
        const found = formatted.find(c => c.SellerId === sellerId);
        setSelectedChat(found || formatted[0]);
      } else if (formatted.length > 0) {
        setSelectedChat(formatted[0]);
      }
    };

    init();
  }, [buyerId, sellerId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) return;
      const res = await axios.get("/messages", { params: { chatId: selectedChat.ChatId } });
      setMessagesMap(prev => ({ ...prev, [selectedChat.ChatId]: res.data }));
    };
    loadMessages();
  }, [selectedChat]);

  const handleSendMessage = async (content) => {
    if (!selectedChat || !content.trim()) return;

    try {
      const res = await axios.post("/messages", {
        chatId: selectedChat.ChatId,
        senderId: buyerId,
        content
      });

      setMessagesMap(prev => ({
        ...prev,
        [selectedChat.ChatId]: [...(prev[selectedChat.ChatId] || []), res.data]
      }));

      setChats(prev => {
        const updated = prev.map(c =>
          c.ChatId === selectedChat.ChatId
            ? { ...c, LastMessage: content, LastSentAt: new Date().toISOString() }
            : c
        );
        updated.sort((a, b) => new Date(b.LastSentAt || 0) - new Date(a.LastSentAt || 0));
        return updated;
      });

      setSelectedChat(prev => ({ ...prev, LastMessage: content, LastSentAt: new Date().toISOString() }));

    } catch (err) {
      console.error(err);
      alert("Gửi tin nhắn thất bại");
    }
  };

  // ================= RENDER =================
  if (minimized) {
    return (
      <div
        className="fixed bottom-4 right-4 w-12 h-12 bg-orange-500 text-white flex items-center justify-center rounded cursor-pointer z-50 shadow-lg"
        onClick={() => setMinimized(false)}
      >
        S
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed bottom-4 right-4 w-[600px] h-[420px] bg-white z-50 rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center p-2 border-b bg-orange-500 text-white">
          <span className="font-bold">Chat với {selectedChat?.SellerName || "Gian hàng"}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMinimized(true)}
              className="px-3 py-1 bg-orange-700 rounded hover:bg-orange-600"
            >
              - 
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {!minimized && (
            <ChatSidebar chats={chats} selectedChat={selectedChat} onSelect={setSelectedChat} />
          )}
          <ChatContent
            chat={selectedChat}
            buyerId={buyerId}
            messages={selectedChat ? messagesMap[selectedChat.ChatId] || [] : []}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </>
  );
}
