import { useEffect, useRef, useState } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";
import { API_URL } from "../../config";
import twemoji from "twemoji";
import { FaPaperPlane } from "react-icons/fa";

/* ================= CONFIG ================= */
const MAX_LEN = 500;
const TWO_MINUTES = 2 * 60 * 1000;

/* ================= EMOJI ================= */
const emojiMap = {
  ":)": "😊",
  ":(": "☹️",
  ":D": "😃",
  ";)": "😉",
  ":P": "😛",
};

const replaceShortcodes = (text) => {
  let t = text;
  for (const [k, v] of Object.entries(emojiMap)) {
    t = t.split(k).join(v);
  }
  return t;
};

const renderEmoji = (text) => {
  if (!text) return null;

  const html = twemoji.parse(replaceShortcodes(text), {
    folder: "svg",
    ext: ".svg",
    className: "twemoji",
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

/* ================= TIME ================= */
const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const isSameBlock = (a, b) => {
  if (!a || !b) return false;
  if (a.SenderId !== b.SenderId) return false;

  return (
    new Date(b.SentAt).getTime() - new Date(a.SentAt).getTime() <
    TWO_MINUTES
  );
};

/* ================= COMPONENT ================= */
export default function SellerChat() {
  const account = JSON.parse(sessionStorage.getItem("account"));
  const sellerId = account?.AccountId;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const scrollRef = useRef(null);

  /* ===== LOAD CHAT LIST ===== */
  useEffect(() => {
    if (!sellerId) return;

    axios
      .get("/chats/seller", { params: { sellerId } })
      .then((res) => setChats(res.data))
      .catch(console.error);
  }, [sellerId]);

  /* ===== LOAD MESSAGES ===== */
  useEffect(() => {
    if (!selectedChat) return;

    axios
      .get("/messages", { params: { chatId: selectedChat.ChatId } })
      .then((res) => setMessages(res.data))
      .catch(console.error);
  }, [selectedChat]);

  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /* ===== SEND ===== */
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat) return;

    try {
      const res = await axios.post("/messages", {
        chatId: selectedChat.ChatId,
        senderId: sellerId,
        content: input.slice(0, MAX_LEN),
      });

      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Header />

      <div className="max-w-6xl mx-auto mt-4 flex gap-6">
        <SellerSidebar />

        <div className="flex-1 bg-white shadow rounded flex h-[650px] overflow-hidden">
          {/* ===== CHAT LIST ===== */}
          <div className="w-72 border-r overflow-y-auto">
            <div className="p-3 font-semibold border-b">Tin nhắn</div>

            {chats.map((chat) => (
              <div
                key={chat.ChatId}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
                  selectedChat?.ChatId === chat.ChatId
                    ? "bg-orange-100"
                    : ""
                }`}
              >
                <div className="flex gap-2 items-center">
                  <img
                    src={
                      chat.BuyerAvatar
                        ? `${API_URL}/uploads/AccountAvatar/${chat.BuyerAvatar}`
                        : `${API_URL}/uploads/AccountAvatar/avtDf.png`
                    }
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {chat.BuyerName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {chat.LastMessage || "Chưa có tin nhắn"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ===== CHAT CONTENT ===== */}
          <div className="flex-1 flex flex-col">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Chọn cuộc trò chuyện
              </div>
            ) : (
              <>
                <div className="p-3 border-b font-semibold">
                  Chat với {selectedChat.BuyerName}
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-3 bg-gray-50"
                >
                  {messages.map((m, index) => {
                    const prev = messages[index - 1];
                    const next = messages[index + 1];

                    const isMe = m.SenderId === sellerId;
                    const samePrev = isSameBlock(prev, m);
                    const sameNext = isSameBlock(m, next);
                    const showTime = index === 0 || !samePrev;

                    let radius = "rounded-lg";

                    if (!samePrev && sameNext) {
                      radius = isMe
                        ? "rounded-lg rounded-tr-2xl"
                        : "rounded-lg rounded-tl-2xl";
                    } else if (samePrev && !sameNext) {
                      radius = isMe
                        ? "rounded-lg rounded-br-2xl"
                        : "rounded-lg rounded-bl-2xl";
                    }

                    return (
                      <div key={m.MessageId}>
                        {showTime && (
                          <div className="text-center text-xs text-gray-400 my-2">
                            {formatTime(m.SentAt)}
                          </div>
                        )}

                        <div
                          className={`flex ${
                            isMe ? "justify-end" : "justify-start"
                          } mb-1`}
                        >
                          <div
                            className={radius}
                            style={{
                              maxWidth: "65%",
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.875rem",
                              lineHeight: "1.25rem",
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              backgroundColor: isMe ? "#f97316" : "#fff",
                              color: isMe ? "#fff" : "#000",
                              border: isMe
                                ? "none"
                                : "1px solid #e5e7eb",
                              fontFamily:
                                '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
                            }}
                          >
                            {renderEmoji(m.Content)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ===== INPUT ===== */}
                <div className="p-3 border-t flex gap-2 bg-white">
                  <input
                    value={input}
                    maxLength={MAX_LEN}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && sendMessage()
                    }
                    className="flex-1 h-11 border rounded-full px-4 text-sm focus:outline-none"
                    placeholder="Nhập tin nhắn"
                  />
                  <button
                    onClick={sendMessage}
                    className="h-11 w-11 bg-orange-500 text-white rounded-full flex items-center justify-center"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
