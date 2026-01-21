import { useEffect, useRef, useState } from "react";
import twemoji from "twemoji";
import { FaPaperPlane } from "react-icons/fa";

const MAX_LEN = 500;
const emojiMap = { ":)": "😊", ":(": "☹️", ":D": "😃", ";)": "😉", ":P": "😛" };

const replaceShortcodes = (text) => {
  let newText = text;
  for (const [k, v] of Object.entries(emojiMap)) newText = newText.split(k).join(v);
  return newText;
};

export default function ChatContent({ chat, buyerId, messages = [], onSendMessage }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const isSameBlock = (a, b) => a && b && a.SenderId === b.SenderId && new Date(b.SentAt) - new Date(a.SentAt) <= 2 * 60 * 1000;

  const send = async () => {
    if (!input.trim()) return;
    if (onSendMessage) {
      await onSendMessage(input.slice(0, MAX_LEN));
      setInput("");
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!chat) return <div className="flex-1 flex items-center justify-center text-gray-400">Chọn gian hàng để chat</div>;

  const renderMessage = (text) => <span dangerouslySetInnerHTML={{ __html: twemoji.parse(replaceShortcodes(text), { folder: "svg", ext: ".svg", className: "twemoji" }) }} />;

  return (
    <div className="flex-1 flex flex-col">
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {messages.map((m, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isMe = m.SenderId === buyerId;
          const samePrev = isSameBlock(prev, m);
          const sameNext = isSameBlock(m, next);
          const showTime = index === 0 || !samePrev;

          let radius = "rounded-lg";
          if (!samePrev && sameNext) radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
          else if (samePrev && !sameNext) radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";

          return (
            <div key={m.MessageId}>
              {showTime && <div className="text-center text-xs text-gray-400 my-2">{formatTime(m.SentAt)}</div>}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
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
                    border: isMe ? "none" : "1px solid #e5e7eb",
                    fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
                  }}
                >
                  {renderMessage(m.Content)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-3 border-t flex gap-2 bg-white">
        <input
          className="flex-1 h-11 border rounded-full px-4 text-sm focus:outline-none"
          value={input}
          maxLength={MAX_LEN}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Nhập nội dung tin nhắn"
        />
        <button onClick={send} className="h-11 bg-orange-500 text-white px-5 rounded-full text-sm cursor-pointer"><FaPaperPlane /></button>
      </div>
    </div>
  );
}
