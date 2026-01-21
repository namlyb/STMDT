import { useState, useEffect, useMemo } from "react";
import axios from "../lib/axios";
import BuyerChat from "../../page/Buyer/BuyerChat";

export default function ChatBubble({ sellerId, visible = true, onOpen }) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const account = JSON.parse(sessionStorage.getItem("account"));
  const buyerId = account?.AccountId;

  const loadChats = async () => {
    if (!buyerId) return;
    const res = await axios.get("/chats/buyer", { params: { buyerId } });
    setChats(res.data);
  };

  useEffect(() => {
    loadChats();
    // Polling để nhận tin nhắn mới
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [buyerId]);

  const totalUnread = useMemo(() => chats.reduce((sum, c) => sum + (c.UnreadCount || 0), 0), [chats]);

  if (!visible) return null;

  if (open)
    return (
      <BuyerChat
        sellerId={sellerId}
        onClose={() => setOpen(false)}
        onRead={(chatId) =>
          setChats(prev => prev.map(c => (c.ChatId === chatId ? { ...c, UnreadCount: 0 } : c)))
        }
      />
    );

  return (
    <div
      onClick={() => {
        if (onOpen) onOpen();
        else setOpen(true);
      }}
      className="fixed bottom-6 right-6 w-12 h-12 bg-orange-500 text-white rounded-full cursor-pointer shadow-xl flex items-center justify-center z-[99999]"
    >
      <span className="text-lg font-bold select-none">S</span>
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      )}
    </div>
  );
}
