import { useEffect, useRef, useState } from "react";
import twemoji from "twemoji";
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
import FileUploadModal from "./FileUploadModal";
import CallModal from "./CallModal";
import axios from "../lib/axios";
import { API_URL } from "../../config";

const MAX_LEN = 500;
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
  return new Date(b.SendAt) - new Date(a.SendAt) <= 2 * 60 * 1000;
};

const ChatContent = ({
  chat,
  currentUserId,
  messages = [],
  onSendMessage,
  onNewMessage,
  onInitiateCall,
  socket,
}) => {
  const [input, setInput] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const scrollRef = useRef(null);

  const send = async () => {
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

  const initiateCall = async (type) => {
    if (onInitiateCall) {
      onInitiateCall(type);
    } else {
      if (!chat) return;
      try {
        let receiverId;
        if (chat.BuyerId && chat.SellerId) {
          receiverId = chat.BuyerId == currentUserId ? chat.SellerId : chat.BuyerId;
        } else if (chat.SellerId && !chat.BuyerId) {
          receiverId = chat.SellerId;
        } else if (chat.BuyerId && !chat.SellerId) {
          receiverId = chat.BuyerId;
        } else {
          throw new Error("Không thể xác định người nhận cuộc gọi");
        }

        const response = await axios.post("/calls/initiate", {
          chatId: chat.ChatId,
          callerId: currentUserId,
          receiverId: receiverId,
          type: type,
        });

        setActiveCall(response.data);
        setIsCallModalOpen(true);
      } catch (error) {
        console.error("Failed to initiate call:", error);
        alert("Không thể bắt đầu cuộc gọi: " + (error.response?.data?.message || error.message));
      }
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleCallAccepted = (updatedCall) => {
      if (activeCall?.CallId === updatedCall.CallId) {
        setActiveCall(updatedCall);
      }
    };
    const handleCallEnded = (updatedCall) => {
      if (activeCall?.CallId === updatedCall.CallId) {
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
  }, [socket, activeCall]);

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
                <FaMusic className="text-2xl text-green-500" />
                <div className="flex-1">
                  <p className="font-medium truncate">{message.FileName || "Audio file"}</p>
                  <audio controls className="w-full mt-2" src={fileURL} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getFileIcon(message.FileMimeType, message.FileName)}</div>
                <div className="flex-1">
                  <p className="font-medium truncate">{message.FileName || "File"}</p>
                  {message.FileSize && <p className="text-sm text-gray-500">{(message.FileSize / 1024).toFixed(1)} KB</p>}
                </div>
                <a
                  href={fileURL}
                  download={message.FileName || "file"}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
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
          <p className="mt-2 text-sm text-gray-700">{message.Content}</p>
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

  const uniqueMessages = messages.filter((msg, index, self) => index === self.findIndex((m) => m.MessageId === msg.MessageId));

  return (
    <div className="flex-1 flex flex-col relative">
      {activeCall && (
        <CallModal
          call={activeCall}
          currentUserId={currentUserId}
          isIncoming={false}
          onEndCall={() => {
            setActiveCall(null);
            setIsCallModalOpen(false);
          }}
          isOpen={isCallModalOpen}
          socket={socket}
        />
      )}

      {imageViewer && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999] flex items-center justify-center"
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

      {showFileUpload && (
        <FileUploadModal
          chatId={chat?.ChatId}
          senderId={currentUserId}
          onClose={() => setShowFileUpload(false)}
          onSuccess={(newMessage) => {
            if (onNewMessage) onNewMessage(newMessage);
          }}
        />
      )}

      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto bg-gray-50" style={{ maxHeight: "500px", overflowX: "hidden" }}>
        {uniqueMessages.map((m, index) => {
          const prev = uniqueMessages[index - 1];
          const next = uniqueMessages[index + 1];
          const isMe = m.SenderId == currentUserId;
          const samePrev = isSameBlock(prev, m);
          const sameNext = isSameBlock(m, next);
          const showTime = index === 0 || !samePrev;

          let radius = "rounded-lg";
          if (!samePrev && sameNext) radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
          else if (samePrev && !sameNext) radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";

          // Xử lý call_missed
          if (m.MessageType === 'call_missed') {
            return (
              <div key={m.MessageId || `${m.SendAt}_${index}`}>
                {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(m.SendAt)}</div>}
                <div className="flex justify-center">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-sm">
                    <p className="text-sm text-gray-700 mb-2">{m.Content}</p>
                    <button
                      onClick={() => {
                        // Xác định loại cuộc gọi từ nội dung (nếu có từ "video")
                        const isVideo = m.Content.toLowerCase().includes('video');
                        initiateCall(isVideo ? 'video' : 'audio');
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      {m.Content.toLowerCase().includes('video') ? 'Gọi video lại' : 'Gọi lại'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (m.MessageType === "call_invite" || m.MessageType === "call_end") {
            return (
              <div key={m.MessageId || `${m.SendAt}_${index}`}>
                {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(m.SendAt)}</div>}
                <div className="flex justify-center">
                  <div className="text-center text-sm text-gray-500 italic py-2 px-4 bg-gray-100 rounded-full">{m.Content}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={m.MessageId || `${m.SendAt}_${index}`}>
              {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(m.SendAt)}</div>}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={radius}
                  style={{
                    maxWidth: m.MessageType !== "text" ? "100%" : "65%",
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
                  {m.MessageType === "text" ? renderMessage(m) : renderFileMessage(m)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t flex gap-2 bg-white">
        <div className="flex gap-1 mr-2">
          <button
            onClick={() => initiateCall("audio")}
            disabled={!chat || activeCall}
            className="h-11 w-11 flex items-center cursor-pointer justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gọi thoại"
          >
            <FaPhone />
          </button>
          <button
            onClick={() => initiateCall("video")}
            disabled={!chat || activeCall}
            className="h-11 w-11 flex items-center justify-center cursor-pointer text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gọi video"
          >
            <FaVideo />
          </button>
        </div>

        <button
          onClick={() => setShowFileUpload(true)}
          className="h-11 w-11 flex items-center cursor-pointer justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Gửi file"
          disabled={!chat || activeCall}
        >
          <FaPaperclip size={20} />
        </button>

        <input
          className="flex-1 h-11 border rounded-full px-4 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
          value={input}
          maxLength={MAX_LEN}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={chat ? "Nhập nội dung tin nhắn" : "Chọn cuộc trò chuyện"}
          disabled={!chat || activeCall}
        />

        <button
          onClick={send}
          disabled={!chat || !input.trim() || activeCall}
          className="h-11 bg-orange-500 text-white px-5 rounded-full text-sm cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatContent;