import { useState, useEffect, useMemo } from "react";
import axios from "../lib/axios";
import BuyerChat from "../../page/Buyer/BuyerChat";

export default function ChatBubble({ sellerId, visible = true, onOpen }) {
  const [open, setOpen] = useState(false); // internal open cho các màn khác
  const [chats, setChats] = useState([]);
  const account = JSON.parse(sessionStorage.getItem("account"));
  const buyerId = account?.AccountId;

  useEffect(() => {
    if (!buyerId) return;
    const loadChats = async () => {
      try {
        const res = await axios.get("/chats/buyer", { params: { buyerId } });
        setChats(res.data);
      } catch {
        console.error("Load unread chat failed");
      }
    };
    loadChats();
  }, [buyerId]);

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.UnreadCount || 0), 0),
    [chats]
  );

  if (!visible) return null; // ẩn bubble nếu parent muốn ẩn

  // nếu internal open = true, Bubble tự mở popup của nó
  if (open) return <BuyerChat sellerId={sellerId} onClose={() => setOpen(false)} />;

  return (
    <div
      onClick={() => {
        // Nếu parent truyền onOpen (ProductDetail), gọi để bật popup ProductDetail
        if (onOpen) onOpen();
        // nếu không, mở internal popup của bubble
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
