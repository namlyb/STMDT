import { useEffect, useState, useRef } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";
import { API_URL } from "../../config";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane, FaPaperclip, FaFile, FaDownload, FaImage, FaVideo, FaMusic, FaFilePdf, FaFileWord, FaFileExcel, FaFileArchive, FaTimes } from "react-icons/fa";
import FileUploadModal from "../../components/ChatBox/FileUploadModal";
import twemoji from "twemoji";

const socket = io(API_URL, {
  transports: ["websocket"],
});

// Emoji và format time như BuyerChat
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

  const msgDateOnly = new Date(msgY, msgM, msgD);
  const nowDateOnly = new Date(nowY, nowM, nowD);
  const diffDays = Math.floor((nowDateOnly - msgDateOnly) / (24 * 60 * 60 * 1000));

  const hh = msgDate.getHours().toString().padStart(2, "0");
  const mm = msgDate.getMinutes().toString().padStart(2, "0");

  if (msgY === nowY && msgM === nowM && msgD === nowD) {
    return `${hh}:${mm}`;
  }

  if (diffDays > 0 && diffDays < 7) {
    const thu = msgDate.getDay();
    const thuText = thu === 0 ? "CN" : `T${thu + 1}`;
    return `${thuText} lúc ${hh}:${mm}`;
  }

  const day = msgD;
  const month = msgM + 1;

  if (msgY !== nowY) {
    return `${day} THG ${month}/${msgY} lúc ${hh}:${mm}`;
  }

  return `${day} THG ${month} lúc ${hh}:${mm}`;
};

// Kiểm tra 2 tin nhắn có cùng block không (cùng người gửi và cách nhau ≤ 1 phút)
const isSameBlock = (a, b) => {
  if (!a || !b) return false;
  if (a.SenderId !== b.SenderId) return false;
  return new Date(b.SendAt) - new Date(a.SendAt) <= 60000; // 1 phút
};

// Simple Chat Content Component for Seller
const SellerChatContent = ({ chat, currentUserId, messages = [], onSendMessage, onNewMessage, sellerAvatar }) => {
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
    if (mimeType.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (mimeType.startsWith('video/')) return <FaVideo className="text-red-500" />;
    if (mimeType.startsWith('audio/')) return <FaMusic className="text-green-500" />;
    if (fileName?.endsWith('.pdf')) return <FaFilePdf className="text-red-500" />;
    if (fileName?.endsWith('.doc') || fileName?.endsWith('.docx')) return <FaFileWord className="text-blue-500" />;
    if (fileName?.endsWith('.xls') || fileName?.endsWith('.xlsx')) return <FaFileExcel className="text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FaFileArchive className="text-yellow-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const renderFileMessage = (message) => {
    const isImage = message.MessageType === 'image';
    const isVideo = message.MessageType === 'video';
    const isAudio = message.MessageType === 'audio';
    const fileURL = message.FileURL || `/api/files/${message.FileURL?.split('/').pop()}`;
    
    return (
    <div className="max-w-xs">
      <div className={`rounded-lg overflow-hidden ${isImage ? 'border' : ''}`}>
        {isImage ? (
          <div className="relative group">
            <img
              src={fileURL}
              alt={message.FileName || "Image"}
              className="max-w-full max-h-64 object-contain cursor-pointer bg-gray-100 group-hover:blur-sm transition-all duration-200"
              onClick={() => setImageViewer({
                url: fileURL,
                name: message.FileName || "Image"
              })}
            />
            <div className="absolute inset-0 backdrop-blur-0 group-hover:backdrop-blur-[2px] bg-white/0 group-hover:bg-white/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setImageViewer({
                  url: fileURL,
                  name: message.FileName || "Image"
                })}
                className="p-2 bg-white/80 backdrop-blur-sm cursor-pointer rounded-full shadow-sm hover:bg-white hover:shadow-md transition-all"
              >
                <FaImage className="text-gray-700" />
              </button>
            </div>
          </div>
        ) : isVideo ? (
          <div className="relative">
            <video
              controls
              className="max-w-full max-h-64 bg-black"
              poster={message.ThumbnailURL}
            >
              <source src={fileURL} type={message.FileMimeType || 'video/mp4'} />
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          </div>
        ) : isAudio ? (
          <div className="p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <FaMusic className="text-2xl text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-ellipsis overflow-hidden" title={message.FileName || "Audio file"}>
                  {message.FileName || "Audio file"}
                </p>
                <audio
                  controls
                  className="w-full mt-2"
                  src={fileURL}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-2xl flex-shrink-0">
                {getFileIcon(message.FileMimeType, message.FileName)}
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="font-medium truncate text-ellipsis overflow-hidden"
                  title={message.FileName || "File"}
                >
                  {message.FileName || "File"}
                </p>
                {message.FileSize && (
                  <p className="text-sm text-gray-500">
                    {(message.FileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <a
                href={fileURL}
                download={message.FileName || "file"}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                title="Download"
              >
                <FaDownload />
              </a>
            </div>
          </div>
        )}
      </div>
      {message.Content && message.Content !== message.FileName && (
        <p className="mt-2 text-sm text-gray-700 break-words whitespace-pre-wrap" 
           style={{ 
             maxWidth: '100%',
             wordBreak: 'break-word',
             overflowWrap: 'break-word'
           }}>
          {message.Content}
        </p>
      )}
    </div>
  );
  };

  // Lọc tin nhắn trùng lặp
  const uniqueMessages = messages.filter((msg, index, self) =>
    index === self.findIndex((m) => m.MessageId === msg.MessageId)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUploadModal
          chatId={chat?.ChatId}
          senderId={currentUserId}
          onClose={() => setShowFileUpload(false)}
          onSuccess={(newMessage) => {
            if (onNewMessage) {
              onNewMessage(newMessage);
            }
            setShowFileUpload(false);
          }}
        />
      )}

      {/* Image Viewer Modal */}
      {imageViewer && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setImageViewer(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header với tiêu đề và nút đóng */}
            <div className="absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-between p-3 border-b">
              <div className="text-sm font-medium text-gray-700 truncate flex-1 mr-4">
                {imageViewer.name}
              </div>
              <div className="flex items-center gap-2">
                {/* Nút download */}
                <a
                  href={imageViewer.url}
                  download={imageViewer.name}
                  className="p-2 text-gray-600 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Download"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaDownload size={20} />
                </a>
                {/* Nút đóng */}
                <button
                  onClick={() => setImageViewer(null)}
                  className="p-2 text-gray-600 cursor-pointer hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Đóng"
                >
                  <FaTimes size={24} />
                </button>
              </div>
            </div>
            
            {/* Ảnh */}
            <div className="pt-12 h-full flex items-center justify-center p-4">
              <img
                src={imageViewer.url}
                alt={imageViewer.name}
                className="max-w-full max-h-[calc(90vh-3rem)] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 p-3 overflow-y-auto bg-gray-50"
        style={{ 
          maxHeight: '500px',
          overflowX: 'hidden'
        }}
      >
        {uniqueMessages.map((msg, index) => {
          const prev = uniqueMessages[index - 1];
          const next = uniqueMessages[index + 1];
          const isMe = msg.SenderId == currentUserId;
          const samePrev = isSameBlock(prev, msg);
          const sameNext = isSameBlock(msg, next);
          const showTime = index === 0 || !samePrev;

          let radius = "rounded-lg";
          if (!samePrev && sameNext) {
            radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
          } else if (samePrev && !sameNext) {
            radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";
          }

          return (
            <div key={msg.MessageId || `${msg.SendAt}_${index}`}>
              {showTime && (
                <div className="text-center text-xs text-gray-400 my-2">
                  {formatTime(msg.SendAt)}
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={radius}
                  style={{
                    maxWidth: msg.MessageType !== 'text' ? '100%' : '65%',
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    lineHeight: "1.25rem",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    backgroundColor: isMe ? "#f97316" : "#fff",
                    color: isMe ? "#000" : "#000",
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
                  }}
                >
                  {msg.MessageType === 'text' ? (
                    <span dangerouslySetInnerHTML={{
                      __html: twemoji.parse(replaceShortcodes(msg.Content), {
                        folder: "svg",
                        ext: ".svg",
                        className: "twemoji",
                      })
                    }} />
                  ) : (
                    renderFileMessage(msg)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3 bg-white min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFileUpload(true)}
            className="h-10 w-10 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
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
            className="h-10 w-10 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function SellerChat() {
  const navigate = useNavigate();
  const account = JSON.parse(sessionStorage.getItem("account"));
  const sellerId = account?.AccountId;
  const sellerAvatar = account?.Avatar;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const addedMessageIds = useRef(new Set());

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
        console.log("Chats loaded:", res.data);
        setChats(res.data);
      })
      .catch(err => {
        console.error("Error loading chats:", err);
      });
  }, [sellerId]);

  useEffect(() => {
    if (!selectedChat) return;
    
    const loadMessages = async () => {
      try {
        const res = await axios.get("/messages", {
          params: { chatId: selectedChat.ChatId },
        });
        console.log("Messages loaded:", res.data.length);
        setMessages(res.data);

        // Đánh dấu đã đọc
        await axios.post("/messages/read", {
          chatId: selectedChat.ChatId,
          readerId: sellerId,
        });

        // Cập nhật sidebar
        setChats((prev) =>
          prev.map((c) =>
            c.ChatId === selectedChat.ChatId
              ? { ...c, UnreadCount: 0 }
              : c
          )
        );
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [selectedChat, sellerId]);

  useEffect(() => {
    if (!selectedChat) return;

    socket.emit("joinChat", selectedChat.ChatId);

    const handler = (msg) => {
      console.log("New message received via socket:", msg);
      if (msg.ChatId !== selectedChat.ChatId) return;
      if (addedMessageIds.current.has(msg.MessageId)) return;
      addedMessageIds.current.add(msg.MessageId);

      setMessages((prev) => {
        if (prev.some((m) => m.MessageId === msg.MessageId)) return prev;
        return [...prev, msg];
      });

      // Cập nhật unread count
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

    socket.on("newMessage", handler);

    return () => {
      socket.off("newMessage", handler);
      socket.emit("leaveChat", selectedChat.ChatId);
    };
  }, [selectedChat, sellerId]);

  const sendMessage = async (content) => {
    console.log("Sending message:", content);
    if (!content.trim() || !selectedChat) return;

    try {
      const res = await axios.post("/messages", {
        chatId: selectedChat.ChatId,
        senderId: sellerId,
        content: content,
      });

      const newMsg = res.data;
      console.log("Message sent successfully:", newMsg);
      addedMessageIds.current.add(newMsg.MessageId);

      // Thêm tin nhắn mới vào danh sách
      setMessages(prev => [...prev, newMsg]);
      
    } catch (err) {
      console.error("Send message error:", err);
      alert("Gửi tin nhắn thất bại");
    }
  };

  const handleNewMessage = (newMessage) => {
    console.log("handleNewMessage called:", newMessage);
    if (addedMessageIds.current.has(newMessage.MessageId)) return;
    addedMessageIds.current.add(newMessage.MessageId);
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <>
      <Header />

      <div className="max-w-6xl mx-auto mt-4 flex gap-6">
        <SellerSidebar />

        <div className="flex-1 bg-white flex h-[650px] overflow-hidden rounded-xl border border-gray-300 shadow-md min-w-0">
          {/* ===== CHAT LIST ===== */}
          <div className="w-72 border-r flex flex-col flex-shrink-0">
            <div className="p-3 font-semibold border-b flex-shrink-0">Tin nhắn</div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Chưa có cuộc trò chuyện nào
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.ChatId}
                    onClick={() => {
                      console.log("Selecting chat:", chat);
                      setSelectedChat(chat);
                    }}
                    className={`p-3 cursor-pointer border-b hover:bg-gray-100 transition-colors active:bg-gray-200 flex-shrink-0 ${
                      selectedChat?.ChatId === chat.ChatId
                        ? "bg-orange-50 border-l-4 border-l-orange-500"
                        : ""
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
                        <div className="font-semibold text-sm truncate text-ellipsis overflow-hidden">
                          {chat.BuyerName}
                        </div>
                        <div className="text-xs truncate text-ellipsis overflow-hidden">
                          <span
                            className={
                              chat.UnreadCount > 0
                                ? "font-bold text-black"
                                : "text-gray-500"
                            }
                          >
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

          {/* ===== CHAT CONTENT ===== */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-lg font-medium mb-2">Chọn cuộc trò chuyện</p>
                <p className="text-sm text-gray-500 text-center">Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin</p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b font-semibold flex items-center justify-between bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={
                        selectedChat.BuyerAvatar
                          ? `${API_URL}/uploads/AccountAvatar/${selectedChat.BuyerAvatar}`
                          : `${API_URL}/uploads/AccountAvatar/avtDf.png`
                      }
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      alt={selectedChat.BuyerName}
                    />
                    <span className="text-gray-800 truncate text-ellipsis overflow-hidden">
                      Chat với {selectedChat.BuyerName}
                    </span>
                  </div>
                </div>

                <SellerChatContent
                  chat={selectedChat}
                  currentUserId={sellerId}
                  messages={messages}
                  onSendMessage={sendMessage}
                  onNewMessage={handleNewMessage}
                  sellerAvatar={sellerAvatar}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}