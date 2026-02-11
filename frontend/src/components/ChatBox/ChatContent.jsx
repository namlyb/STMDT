import { useEffect, useRef, useState } from "react";
import twemoji from "twemoji";
import { FaPaperPlane, FaPaperclip, FaFile, FaDownload, FaImage, FaVideo, FaMusic, FaFilePdf, FaFileWord, FaFileExcel, FaFileArchive } from "react-icons/fa";
import FileUploadModal from "./FileUploadModal";

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

const isSameBlock = (a, b) => {
  if (!a || !b) return false;
  if (a.SenderId !== b.SenderId) return false;
  return new Date(b.SendAt) - new Date(a.SendAt) <= 2 * 60 * 1000;
};

const ChatContent = ({ chat, currentUserId, messages = [], onSendMessage, onNewMessage }) => {
  const [input, setInput] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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
                className="max-w-full max-h-64 object-contain cursor-pointer bg-gray-100"
                onClick={() => setImageViewer({
                  url: fileURL,
                  name: message.FileName || "Image"
                })}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setImageViewer({
                    url: fileURL,
                    name: message.FileName || "Image"
                  })}
                  className="p-2 bg-white bg-opacity-80 rounded-full"
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
                <FaMusic className="text-2xl text-green-500" />
                <div className="flex-1">
                  <p className="font-medium truncate">{message.FileName || "Audio file"}</p>
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
                <div className="text-2xl">
                  {getFileIcon(message.FileMimeType, message.FileName)}
                </div>
                <div className="flex-1">
                  <p className="font-medium truncate">{message.FileName || "File"}</p>
                  {message.FileSize && (
                    <p className="text-sm text-gray-500">
                      {(message.FileSize / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <a
                  href={fileURL}
                  download={message.FileName || "file"}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Download"
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

  const ImageViewerModal = () => {
    if (!imageViewer) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex items-center justify-center"
        onClick={() => setImageViewer(null)}
      >
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => setImageViewer(null)}
            className="absolute top-4 right-4 text-white text-2xl z-10 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            ✕
          </button>
          <img
            src={imageViewer.url}
            alt={imageViewer.name}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
            <p className="truncate">{imageViewer.name}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (text) => {
    const html = twemoji.parse(replaceShortcodes(text), {
      folder: "svg",
      ext: ".svg",
      className: "twemoji",
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Lọc tin nhắn trùng lặp đơn giản dựa trên MessageId
  const uniqueMessages = messages.filter((msg, index, self) =>
    index === self.findIndex((m) => m.MessageId === msg.MessageId)
  );

  return (
    <div className="flex-1 flex flex-col relative">
      <ImageViewerModal />

      {showFileUpload && (
        <FileUploadModal
          chatId={chat?.ChatId}
          senderId={currentUserId}
          onClose={() => setShowFileUpload(false)}
          onSuccess={(newMessage) => {
            if (onNewMessage) {
              onNewMessage(newMessage);
            }
          }}
        />
      )}

      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {uniqueMessages.map((m, index) => {
          const prev = uniqueMessages[index - 1];
          const next = uniqueMessages[index + 1];
          const isMe = m.SenderId == currentUserId;
          const samePrev = isSameBlock(prev, m);
          const sameNext = isSameBlock(m, next);
          const showTime = index === 0 || !samePrev;

          let radius = "rounded-lg";
          if (!samePrev && sameNext) {
            radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
          } else if (samePrev && !sameNext) {
            radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";
          }

          return (
            <div key={m.MessageId || `${m.SendAt}_${index}`}>
              {showTime && (
                <div className="text-center text-xs text-gray-400 my-2">
                  {formatTime(m.SendAt)}
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={radius}
                  style={{
                    maxWidth: m.MessageType !== 'text' ? '100%' : '65%',
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    lineHeight: "1.25rem",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    backgroundColor: isMe ? "#f97316" : "#fff",
                    color: isMe ? "#fff" : "#000",
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
                  }}
                >
                  {m.MessageType === 'text' ? (
                    renderMessage(m.Content)
                  ) : (
                    renderFileMessage(m)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t flex gap-2 bg-white">
        <button
          onClick={() => setShowFileUpload(true)}
          className="h-11 w-11 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Gửi file"
          disabled={!chat}
        >
          <FaPaperclip size={20} />
        </button>
        <input
          className="flex-1 h-11 border rounded-full px-4 text-sm focus:outline-none focus:border-blue-500"
          value={input}
          maxLength={MAX_LEN}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={chat ? "Nhập nội dung tin nhắn" : "Chọn cuộc trò chuyện"}
          disabled={!chat}
        />
        <button
          onClick={send}
          disabled={!chat || !input.trim()}
          className="h-11 bg-orange-500 text-white px-5 rounded-full text-sm cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatContent;