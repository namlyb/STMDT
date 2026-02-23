import { useEffect, useState, useRef } from "react";
import ChatSidebar from "../../components/ChatBox/ChatSidebar";
import ChatContent from "../../components/ChatBox/ChatContent";
import { useSocket } from "../../context/SocketContext";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import CallModal from "../../components/ChatBox/CallModal";

export default function BuyerChat({ sellerId, onClose }) {
  const { socket } = useSocket();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const buyerId = account?.AccountId;
  const AVATAR = `${API_URL}/uploads/AccountAvatar`;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const addedMessageIds = useRef(new Set());

  // Call states
  const [activeCall, setActiveCall] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const activeCallRef = useRef(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Khởi tạo danh sách chat
  useEffect(() => {
    if (!buyerId) return;

    const init = async () => {
      try {
        if (sellerId) {
          await axios.post("/chats", { buyerId, sellerId });
        }

        const chatRes = await axios.get("/chats/buyer", { params: { buyerId } });
        const formatted = chatRes.data.map((c) => ({
          ...c,
          Avt: c.SellerAvatar ? `${AVATAR}/${c.SellerAvatar}` : `${AVATAR}/avtDf.png`,
        }));

        formatted.sort((a, b) => new Date(b.LastSendAt || 0) - new Date(a.LastSendAt || 0));
        setChats(formatted);

        if (sellerId) {
          const found = formatted.find((c) => c.SellerId === sellerId);
          setSelectedChat(found || formatted[0]);
        } else if (formatted.length > 0) {
          setSelectedChat(formatted[0]);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    init();
  }, [buyerId, sellerId]);

  // Load tin nhắn khi chọn chat
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat) return;
      try {
        const res = await axios.get("/messages", { params: { chatId: selectedChat.ChatId } });
        const messages = res.data;
        messages.forEach((msg) => addedMessageIds.current.delete(msg.MessageId));
        setMessagesMap((prev) => ({ ...prev, [selectedChat.ChatId]: messages }));

        await axios.post("/messages/read", {
          chatId: selectedChat.ChatId,
          readerId: buyerId,
        });

        setChats((prev) =>
          prev.map((c) =>
            c.ChatId === selectedChat.ChatId ? { ...c, UnreadCount: 0 } : c
          )
        );
      } catch (err) {
        console.error("Mark as read failed", err);
      }
    };
    loadMessages();
  }, [selectedChat, buyerId]);

  // Socket: tin nhắn mới
  useEffect(() => {
    if (!selectedChat || !socket) return;
    socket.emit("joinChat", selectedChat.ChatId);

    const handler = (msg) => {
      if (msg.ChatId !== selectedChat.ChatId) return;
      if (addedMessageIds.current.has(msg.MessageId)) return;
      addedMessageIds.current.add(msg.MessageId);

      setMessagesMap((prev) => {
        const list = prev[msg.ChatId] || [];
        if (list.some((m) => m.MessageId === msg.MessageId)) return prev;
        return { ...prev, [msg.ChatId]: [...list, msg] };
      });

      setChats((prev) =>
        prev.map((c) =>
          c.ChatId === msg.ChatId
            ? {
                ...c,
                LastMessage: msg.Content,
                LastSendAt: msg.SendAt,
                UnreadCount:
                  msg.SenderId !== buyerId ? (c.UnreadCount || 0) + 1 : c.UnreadCount,
              }
            : c
        )
      );
    };

    socket.on("newMessage", handler);
    return () => {
      socket.off("newMessage", handler);
      socket.emit("leaveChat", selectedChat.ChatId);
    };
  }, [selectedChat, buyerId, socket]);

  // Socket: cuộc gọi (lắng nghe 1 lần)
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = (updatedCall) => {
      if (activeCallRef.current?.CallId === updatedCall.CallId) {
        setActiveCall(updatedCall);
      }
    };

    const handleCallEnded = (updatedCall) => {
      if (activeCallRef.current?.CallId === updatedCall.CallId) {
        setActiveCall(null);
        setIsCallModalOpen(false);
      }
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket]);

  const handleSendMessage = async (content) => {
    if (!selectedChat || !content.trim()) return;
    try {
      const res = await axios.post("/messages", {
        chatId: selectedChat.ChatId,
        senderId: buyerId,
        content,
      });

      const newMsg = res.data;
      addedMessageIds.current.add(newMsg.MessageId);

      setMessagesMap((prev) => ({
        ...prev,
        [selectedChat.ChatId]: [...(prev[selectedChat.ChatId] || []), newMsg],
      }));

      setChats((prev) => {
        const updated = prev.map((c) =>
          c.ChatId === selectedChat.ChatId
            ? { ...c, LastMessage: newMsg.Content, LastSendAt: newMsg.SendAt }
            : c
        );
        updated.sort((a, b) => new Date(b.LastSendAt) - new Date(a.LastSendAt));
        return updated;
      });

      setSelectedChat((prev) => ({
        ...prev,
        LastMessage: newMsg.Content,
        LastSendAt: newMsg.SendAt,
      }));
    } catch {
      alert("Gửi tin nhắn thất bại");
    }
  };

  const handleNewMessage = (newMessage) => {
    if (addedMessageIds.current.has(newMessage.MessageId)) return;
    addedMessageIds.current.add(newMessage.MessageId);
    setMessagesMap((prev) => ({
      ...prev,
      [selectedChat.ChatId]: [...(prev[selectedChat.ChatId] || []), newMessage],
    }));
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.ChatId === selectedChat.ChatId
          ? { ...c, LastMessage: newMessage.Content, LastSendAt: newMessage.SendAt }
          : c
      );
      updated.sort((a, b) => new Date(b.LastSendAt) - new Date(a.LastSendAt));
      return updated;
    });
  };

  // Khởi tạo cuộc gọi (outgoing)
  const initiateCall = async (type) => {
    if (!selectedChat) return;
    try {
      const receiverId = selectedChat.SellerId;
      const response = await axios.post("/calls/initiate", {
        chatId: selectedChat.ChatId,
        callerId: buyerId,
        receiverId: receiverId,
        type: type,
      });
      setActiveCall(response.data);
      setIsCallModalOpen(true);
    } catch (error) {
      console.error("Failed to initiate call:", error);
      alert("Không thể bắt đầu cuộc gọi: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[600px] h-[420px] bg-white z-50 rounded-xl shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b bg-orange-500 text-white">
        <span className="font-bold">Chat với {selectedChat?.SellerName || "Gian hàng"}</span>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-orange-700 cursor-pointer rounded hover:bg-orange-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Call Modal */}
      {activeCall && (
        <CallModal
          call={activeCall}
          currentUserId={buyerId}
          isIncoming={false}
          onEndCall={() => {
            setActiveCall(null);
            setIsCallModalOpen(false);
          }}
          isOpen={isCallModalOpen}
          socket={socket}
        />
      )}

      {/* Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelect={setSelectedChat}
        />
        <ChatContent
          chat={selectedChat}
          currentUserId={buyerId}
          messages={selectedChat ? messagesMap[selectedChat.ChatId] || [] : []}
          onSendMessage={handleSendMessage}
          onNewMessage={handleNewMessage}
          onInitiateCall={initiateCall} // ✅ truyền prop để gọi từ ChatContent
          socket={socket}
        />
      </div>
    </div>
  );
}