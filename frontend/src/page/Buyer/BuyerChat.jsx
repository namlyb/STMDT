import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!buyerId) return;

    const init = async () => {
      if (sellerId) {
        await axios.post("/chats", { buyerId, sellerId });
      }

      const chatRes = await axios.get("/chats", {
        params: { buyerId }
      });

      const formatted = chatRes.data.map(c => ({
        ...c,
        Avt: c.Avt ? `${AVATAR}/${c.Avt}` : `${AVATAR}/avtDf.png`
      }));

      setChats(formatted);

      if (sellerId) {
        const found = formatted.find(c => c.SellerId === sellerId);
        if (found) {
          setSelectedChat(found);
          return;
        }
      }

      if (formatted.length > 0) {
        setSelectedChat(formatted[0]);
      }
    };

    init();
  }, [buyerId, sellerId]);

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* POPUP CHAT – 3/4 SIZE */}
      <div
        className="
          fixed bottom-4 right-4
          w-[600px] h-[420px]
          bg-white z-50
          rounded-xl shadow-xl
          flex overflow-hidden
        "
      >
        {/* SIDEBAR – 3/4 */}
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelect={setSelectedChat}
        />

        {/* CONTENT */}
        <ChatContent
          chat={selectedChat}
          buyerId={buyerId}
        />
      </div>
    </>
  );
}
