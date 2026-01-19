import { useEffect, useRef, useState } from "react";
import twemoji from "twemoji";

const MAX_LEN = 500;
const isWordChar = (c) => /[a-zA-Z0-9À-ỹ]/.test(c);

// Map shortcode -> Unicode emoji
const emojiMap = {
  ":)": "😊",
  ":(": "☹️",
  ":D": "😃",
  ";)": "😉",
  ":P": "😛",
};

const replaceShortcodes = (text) => {
  let newText = text;
  for (const [key, val] of Object.entries(emojiMap)) {
    newText = newText.split(key).join(val);
  }
  return newText;
};

export default function ChatContent({ chat, buyerId, messages = [], onSendMessage }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // ================= SPLIT MESSAGE =================
  const splitMessageContent = (text) => {
    const parts = [];
    let remaining = text;
    while (remaining.length > MAX_LEN) {
      let cut = -1;
      for (let i = MAX_LEN; i >= 0; i--) {
        const curr = remaining[i];
        const prev = remaining[i - 1];
        if (curr === "\n" && prev && !isWordChar(prev)) {
          cut = i;
          break;
        }
        if (
          curr === " " &&
          prev &&
          !isWordChar(prev) &&
          remaining[i + 1] &&
          !isWordChar(remaining[i + 1])
        ) {
          cut = i;
          break;
        }
      }
      if (cut === -1) {
        parts.push(remaining.slice(0, MAX_LEN));
        remaining = remaining.slice(MAX_LEN);
      } else {
        parts.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut + 1);
      }
    }
    if (remaining.length > 0) parts.push(remaining);
    return parts;
  };

  // ================= TIME =================
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const isSameBlock = (a, b) => {
    if (!a || !b) return false;
    if (a.SenderId !== b.SenderId) return false;
    return new Date(b.SentAt) - new Date(a.SentAt) <= 2 * 60 * 1000;
  };

  // ================= SEND =================
  const send = async () => {
    if (!input.trim()) return;
    if (onSendMessage) {
      await onSendMessage(input);
      setInput("");
    }
  };

  // ================= SCROLL =================
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  if (!chat)
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Chọn gian hàng để chat
      </div>
    );

  // ================= RENDER MESSAGE =================
  const renderMessagePart = (part) => {
    const textWithEmoji = replaceShortcodes(part);

    const html = twemoji.parse(textWithEmoji, {
      folder: "svg",
      ext: ".svg",
      className: "twemoji",
    });

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

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

          const parts = splitMessageContent(m.Content);

          return (
            <div key={m.MessageId}>
              {showTime && (
                <div className="text-center text-xs text-gray-400 my-2">
                  {formatTime(m.SentAt)}
                </div>
              )}
              {parts.map((part, i) => {
                const isFirstPart = i === 0;
                const isLastPart = i === parts.length - 1;
                let radius = "rounded-lg";

                if (isFirstPart && isLastPart) {
                  if (!samePrev && sameNext)
                    radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
                  else if (samePrev && !sameNext)
                    radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";
                } else if (isFirstPart)
                  radius = isMe ? "rounded-lg rounded-tr-2xl" : "rounded-lg rounded-tl-2xl";
                else if (isLastPart)
                  radius = isMe ? "rounded-lg rounded-br-2xl" : "rounded-lg rounded-bl-2xl";

                return (
                  <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`}>
                    <div
                      style={{
                        maxWidth: "65%",
                        padding: "0.5rem 0.75rem",
                        fontSize: "0.875rem",
                        lineHeight: "1.25rem",
                        borderRadius: "0.5rem",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        backgroundColor: isMe ? "#f97316" : "#fff",
                        color: isMe ? "#fff" : "#000",
                        border: isMe ? "none" : "1px solid #e5e7eb",
                        fontFamily:
                          '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                      }}
                    >
                      {renderMessagePart(part)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t flex gap-2 bg-white">
        <input
          className="flex-1 h-11 border rounded-full px-4 text-sm focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Nhập nội dung tin nhắn"
        />
        <button
          onClick={send}
          className="h-11 bg-orange-500 text-white px-5 rounded-full text-sm cursor-pointer"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
