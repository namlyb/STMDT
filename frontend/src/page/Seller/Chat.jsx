import { useEffect, useState, useRef } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";
import { API_URL } from "../../config";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";
import {
  FaPaperPlane,
  FaPaperclip,
  FaFile,
  FaDownload,
  FaImage,
  FaVideo,
  FaMusic,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileArchive,
  FaTimes,
  FaPhone,
} from "react-icons/fa";
import FileUploadModal from "../../components/ChatBox/FileUploadModal";
import CallModal from "../../components/ChatBox/CallModal";
import twemoji from "twemoji";

// ==================== Emoji & Time ====================
const emojiMap = { ":)": "😊", ":(": "☹️", ":D": "😃", ";)": "😉", ":P": "😛" };
const replaceShortcodes = (text) => {
  let newText = text;
  for (const [k, v] of Object.entries(emojiMap)) newText = newText.split(k).join(v);
  return newText;
};

const formatTime = (dateStr) => {
  const msgDate = new Date(dateStr);
  const now = new Date();

  const msgY = msgDate.getFullYear();
  const msgM = msgDate.getMonth();
  const msgD = msgDate.getDate();
  const nowY = now.getFullYear();
  const nowM = now.getMonth();
  const nowD = now.getDate();

  const diffDays = Math.floor((new Date(nowY, nowM, nowD) - new Date(msgY, msgM, msgD)) / (24 * 60 * 60 * 1000));

  const hh = msgDate.getHours().toString().padStart(2, "0");
  const mm = msgDate.getMinutes().toString().padStart(2, "0");

  if (msgY === nowY && msgM === nowM && msgD === nowD) return `${hh}:${mm}`;
  if (diffDays > 0 && diffDays < 7) {
    const thu = msgDate.getDay();
    const thuText = thu === 0 ? "CN" : `T${thu + 1}`;
    return `${thuText} lúc ${hh}:${mm}`;
  }
  const day = msgD;
  const month = msgM + 1;
  if (msgY !== nowY) return `${day} THG ${month}/${msgY} lúc ${hh}:${mm}`;
  return `${day} THG ${month} lúc ${hh}:${mm}`;
};

const isSameBlock = (a, b) => {
  if (!a || !b) return false;
  if (a.SenderId !== b.SenderId) return false;
  return new Date(b.SendAt) - new Date(a.SendAt) <= 60000;
};

// ==================== SellerChatContent ====================
const SellerChatContent = ({
  chat,
  currentUserId,
  messages = [],
  onSendMessage,
  onNewMessage,
  onInitiateCall,
}) => {
  const [input, setInput] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);
  const scrollRef = useRef(null);

  const MAX_LEN = 500;

  const sendMessage = async () => {
    if (!input.trim() || !chat) return;
    if (onSendMessage) {
      try {
        await onSendMessage(input.slice(0, MAX_LEN));
        setInput("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getFileIcon = (mimeType, fileName) => {
    const safeMimeType = mimeType || "";
    if (safeMimeType.startsWith("image/")) return <FaImage className="text-blue-500" />;
    if (safeMimeType.startsWith("video/")) return <FaVideo className="text-red-500" />;
    if (safeMimeType.startsWith("audio/")) return <FaMusic className="text-green-500" />;
    if (fileName?.endsWith(".pdf")) return <FaFilePdf className="text-red-500" />;
    if (fileName?.endsWith(".doc") || fileName?.endsWith(".docx")) return <FaFileWord className="text-blue-500" />;
    if (fileName?.endsWith(".xls") || fileName?.endsWith(".xlsx")) return <FaFileExcel className="text-green-500" />;
    if (safeMimeType.includes("zip") || safeMimeType.includes("compressed")) return <FaFileArchive className="text-yellow-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const renderFileMessage = (message) => {
    const isImage = message.MessageType === "image";
    const isVideo = message.MessageType === "video";
    const isAudio = message.MessageType === "audio";

    let fileURL = message.FileURL;
    if (fileURL && fileURL.startsWith("/api/")) fileURL = `${API_URL}${fileURL}`;
    else if (fileURL && !fileURL.includes("/") && !fileURL.startsWith("http")) fileURL = `${API_URL}/api/files/${fileURL}`;
    else if (!fileURL && message.FileName) fileURL = `${API_URL}/api/files/${message.MessageId}`;

    return (
      <div className="max-w-xs">
        <div className={`rounded-lg overflow-hidden ${isImage ? "border" : ""}`}>
          {isImage ? (
            <div className="relative group">
              <img
                src={fileURL}
                alt={message.FileName || "Image"}
                className="max-w-full max-h-64 object-contain cursor-pointer bg-gray-100 group-hover:blur-sm transition-all duration-200"
                onClick={() => setImageViewer({ url: fileURL, name: message.FileName || "Image" })}
                onError={(e) => (e.target.src = `${API_URL}/uploads/placeholder.png`)}
              />
              <div className="absolute inset-0 backdrop-blur-0 group-hover:backdrop-blur-[2px] bg-white/0 group-hover:bg-white/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setImageViewer({ url: fileURL, name: message.FileName || "Image" })}
                  className="p-2 bg-white/80 backdrop-blur-sm cursor-pointer rounded-full shadow-sm hover:bg-white hover:shadow-md transition-all"
                >
                  <FaImage className="text-gray-700" />
                </button>
              </div>
            </div>
          ) : isVideo ? (
            <div className="relative">
              <video controls className="max-w-full max-h-64 bg-black" poster={message.ThumbnailURL}>
                <source src={fileURL} type={message.FileMimeType || "video/mp4"} />
              </video>
            </div>
          ) : isAudio ? (
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <FaMusic className="text-2xl text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={message.FileName || "Audio file"}>
                    {message.FileName || "Audio file"}
                  </p>
                  <audio controls className="w-full mt-2" src={fileURL} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl flex-shrink-0">{getFileIcon(message.FileMimeType, message.FileName)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={message.FileName || "File"}>
                    {message.FileName || "File"}
                  </p>
                  {message.FileSize && <p className="text-sm text-gray-500">{(message.FileSize / 1024).toFixed(1)} KB</p>}
                </div>
                <a
                  href={fileURL}
                  download={message.FileName || "file"}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  title="Download"
                  onClick={(e) => !fileURL && e.preventDefault()}
                >
                  <FaDownload />
                </a>
              </div>
            </div>
          )}
        </div>
        {message.Content && message.Content !== message.FileName && (
          <p className="mt-2 text-sm text-gray-700 break-words whitespace-pre-wrap">{message.Content}</p>
        )}
      </div>
    );
  };

  const renderMessage = (message) => {
    if (message.MessageType === "call_invite" || message.MessageType === "call_end") {
      return <div className="text-center text-sm text-gray-500 italic py-2">{message.Content}</div>;
    }
    const html = twemoji.parse(replaceShortcodes(message.Content || ""), {
      folder: "svg",
      ext: ".svg",
      className: "twemoji",
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const uniqueMessages = messages.filter(
    (msg, index, self) => index === self.findIndex((m) => m.MessageId === msg.MessageId)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {showFileUpload && (
        <FileUploadModal
          chatId={chat?.ChatId}
          senderId={currentUserId}
          onClose={() => setShowFileUpload(false)}
          onSuccess={(newMessage) => {
            if (onNewMessage) onNewMessage(newMessage);
            setShowFileUpload(false);
          }}
        />
      )}

      {imageViewer && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setImageViewer(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-between p-3 border-b">
              <div className="text-sm font-medium text-gray-700 truncate flex-1 mr-4">{imageViewer.name}</div>
              <div className="flex items-center gap-2">
                <a
                  href={imageViewer.url}
                  download={imageViewer.name}
                  className="p-2 text-gray-600 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaDownload size={20} />
                </a>
                <button
                  onClick={() => setImageViewer(null)}
                  className="p-2 text-gray-600 cursor-pointer hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>
            <div className="pt-12 h-full flex items-center justify-center p-4">
              <img src={imageViewer.url} alt={imageViewer.name} className="max-w-full max-h-[calc(90vh-3rem)] object-contain" />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto bg-gray-50" style={{ maxHeight: "500px", overflowX: "hidden" }}>
        {uniqueMessages.map((msg, index) => {
          const prev = uniqueMessages[index - 1];
          const next = uniqueMessages[index + 1];
          const isMe = msg.SenderId == currentUserId;
          const samePrev = isSameBlock(prev, msg);
          const sameNext = isSameBlock(msg, next);
          const showTime = index === 0 || !samePrev;

          let radius = "rounded-lg";
          if (!samePrev && sameNext) radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
          else if (samePrev && !sameNext) radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";

          if (msg.MessageType === "call_invite" || msg.MessageType === "call_end") {
            return (
              <div key={msg.MessageId || `${msg.SendAt}_${index}`}>
                {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(msg.SendAt)}</div>}
                <div className="flex justify-center">
                  <div className="text-center text-sm text-gray-500 italic py-2 px-4 bg-gray-100 rounded-full">{msg.Content}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.MessageId || `${msg.SendAt}_${index}`}>
              {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(msg.SendAt)}</div>}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={radius}
                  style={{
                    maxWidth: msg.MessageType !== "text" ? "100%" : "65%",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    lineHeight: "1.25rem",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    backgroundColor: isMe ? "#f97316" : "#fff",
                    color: isMe ? "#fff" : "#000",
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
                  }}
                >
                  {msg.MessageType === "text" ? renderMessage(msg) : renderFileMessage(msg)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 p-3 bg-white min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onInitiateCall && onInitiateCall("audio")}
            className="h-10 w-10 flex items-center cursor-pointer justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors flex-shrink-0"
            title="Gọi thoại"
            disabled={!chat}
          >
            <FaPhone />
          </button>
          <button
            onClick={() => onInitiateCall && onInitiateCall("video")}
            className="h-10 w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors flex-shrink-0"
            title="Gọi video"
            disabled={!chat}
          >
            <FaVideo />
          </button>
          <button
            onClick={() => setShowFileUpload(true)}
            className="h-10 w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
            title="Gửi file"
            disabled={!chat}
          >
            <FaPaperclip size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              className="w-full h-10 border border-gray-300 rounded-full px-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={input}
              maxLength={MAX_LEN}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={chat ? "Nhập nội dung tin nhắn..." : "Chọn cuộc trò chuyện"}
              disabled={!chat}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!chat || !input.trim()}
            className="h-10 w-10 bg-orange-500 text-white cursor-pointer rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane size={16} />
          </button>
        </div>
        <div className="text-xs text-gray-400 text-center mt-1">
          {input.length}/{MAX_LEN}
        </div>
      </div>
    </div>
  );
};

// Hàm tạo URL ảnh đại diện
const getAvatarUrl = (avatar) => {
  const defaultAvatar = '/uploads/AccountAvatar/avtDf.png';
  
  if (!avatar) return defaultAvatar;
  
  // Nếu avatar là URL đầy đủ với http:// nhưng page đang dùng https -> chuyển thành https
  if (avatar.startsWith('http://') && window.location.protocol === 'https:') {
    avatar = avatar.replace('http://', 'https://');
  }
  
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  if (API_URL) {
    return `${API_URL}/uploads/AccountAvatar/${avatar}`;
  }
  
  return `/uploads/AccountAvatar/${avatar}`;
};


// ==================== SellerChat chính ====================
export default function SellerChat() {
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const sellerId = account?.AccountId;
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const addedMessageIds = useRef(new Set());

  // Dùng ref để theo dõi activeCall hiện tại, tránh phụ thuộc effect
  const activeCallRef = useRef(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");
    if (roleId !== "3") {
      alert("Bạn không có quyền truy cập");
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (!sellerId) return;
    axios
      .get("/chats/seller", { params: { sellerId } })
      .then((res) => {
        const chatsWithSellerId = res.data.map((chat) => ({
          ...chat,
          SellerId: parseInt(sellerId),
        }));
        setChats(chatsWithSellerId);
      })
      .catch((err) => console.error("Error loading chats:", err));
  }, [sellerId]);

  useEffect(() => {
    if (!selectedChat) return;
    const loadMessages = async () => {
      try {
        const res = await axios.get("/messages", { params: { chatId: selectedChat.ChatId } });
        setMessages(res.data);
        await axios.post("/messages/read", { chatId: selectedChat.ChatId, readerId: sellerId });
        setChats((prev) =>
          prev.map((c) => (c.ChatId === selectedChat.ChatId ? { ...c, UnreadCount: 0 } : c))
        );
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };
    loadMessages();
  }, [selectedChat, sellerId]);

  // Socket events: tin nhắn mới
  useEffect(() => {
    if (!selectedChat || !socket) return;
    socket.emit("joinChat", selectedChat.ChatId);

    const messageHandler = (msg) => {
      if (msg.ChatId !== selectedChat.ChatId) return;
      if (addedMessageIds.current.has(msg.MessageId)) return;
      addedMessageIds.current.add(msg.MessageId);
      setMessages((prev) => {
        if (prev.some((m) => m.MessageId === msg.MessageId)) return prev;
        return [...prev, msg];
      });
      if (msg.SenderId != sellerId) {
        setChats((prev) =>
          prev.map((c) =>
            c.ChatId === selectedChat.ChatId
              ? { ...c, UnreadCount: (c.UnreadCount || 0) + 1 }
              : c
          )
        );
      }
    };

    socket.on("newMessage", messageHandler);
    return () => {
      socket.off("newMessage", messageHandler);
      socket.emit("leaveChat", selectedChat.ChatId);
    };
  }, [selectedChat, sellerId, socket]);

  // Socket events: cuộc gọi (lắng nghe 1 lần, dùng ref để so sánh)
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

  const sendMessage = async (content) => {
    if (!content.trim() || !selectedChat) return;
    try {
      const res = await axios.post("/messages", {
        chatId: selectedChat.ChatId,
        senderId: sellerId,
        content,
      });
      const newMsg = res.data;
      addedMessageIds.current.add(newMsg.MessageId);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error("Send message error:", err);
      alert("Gửi tin nhắn thất bại");
    }
  };

  const handleNewMessage = (newMessage) => {
    if (addedMessageIds.current.has(newMessage.MessageId)) return;
    addedMessageIds.current.add(newMessage.MessageId);
    setMessages((prev) => [...prev, newMessage]);
  };

  const initiateCall = async (type) => {
    if (!selectedChat) return;
    try {
      const receiverId = selectedChat.BuyerId;
      const response = await axios.post("/calls/initiate", {
        chatId: selectedChat.ChatId,
        callerId: sellerId,
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
    <>
      <Header />

      {activeCall && (
        <CallModal
          call={activeCall}
          currentUserId={sellerId}
          isIncoming={false}
          onEndCall={() => {
            setActiveCall(null);
            setIsCallModalOpen(false);
          }}
          isOpen={isCallModalOpen}
          socket={socket}
        />
      )}

      <div className="max-w-6xl mx-auto mt-4 flex gap-6">
        <SellerSidebar />
        <div className="flex-1 bg-white flex h-[650px] overflow-hidden rounded-xl border border-gray-300 shadow-md min-w-0">
          <div className="w-72 border-r flex flex-col flex-shrink-0">
            <div className="p-3 font-semibold border-b flex-shrink-0">Tin nhắn</div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Chưa có cuộc trò chuyện nào</div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.ChatId}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 cursor-pointer border-b hover:bg-gray-100 transition-colors active:bg-gray-200 flex-shrink-0 ${
                      selectedChat?.ChatId === chat.ChatId ? "bg-orange-50 border-l-4 border-l-orange-500" : ""
                    }`}
                  >
                    <div className="flex gap-2 items-center min-w-0">
                      <img
                        src={
                          chat.BuyerAvatar
                            ? `${API_URL}/uploads/AccountAvatar/${chat.BuyerAvatar}`
                            : `${API_URL}/uploads/AccountAvatar/avtDf.png`
                        }
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        alt={chat.BuyerName}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{chat.BuyerName}</div>
                        <div className="text-xs truncate">
                          <span className={chat.UnreadCount > 0 ? "font-bold text-black" : "text-gray-500"}>
                            {chat.LastMessage || "Chưa có tin nhắn"}
                          </span>
                        </div>
                      </div>
                      {chat.UnreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {chat.UnreadCount > 9 ? "9+" : chat.UnreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {!selectedChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-lg font-medium mb-2">Chọn cuộc trò chuyện</p>
                <p className="text-sm text-gray-500 text-center">
                  Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b font-semibold flex items-center justify-between bg-gray-50 flex-shrink-0">
  <div className="flex items-center gap-2 min-w-0">
    <img
      src={getAvatarUrl(selectedChat.BuyerAvatar)}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      alt={selectedChat.BuyerName}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/uploads/AccountAvatar/avtDf.png';
      }}
    />
    <span className="text-gray-800 truncate">Chat với {selectedChat.BuyerName}</span>
  </div>
</div>
                <SellerChatContent
                  chat={selectedChat}
                  currentUserId={sellerId}
                  messages={messages}
                  onSendMessage={sendMessage}
                  onNewMessage={handleNewMessage}
                  onInitiateCall={initiateCall}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}