import { useEffect, useState, useRef } from "react";
import axios from "../lib/axios";

export default function ChatBox({ buyerId, sellerId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get("/chats", {
        params: { buyerId, sellerId },
      });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await axios.post("/chats", {
        buyerId,
        sellerId,
        content: input,
      });
      setInput("");
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // refresh every 3s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-4 left-4 w-80 h-96 bg-white border rounded shadow flex flex-col z-50">
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b">
        <span className="font-semibold">Chat với Seller</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 p-2 overflow-y-auto space-y-2"
      >
        {messages.map(msg => (
          <div
            key={msg.MessageId}
            className={`p-2 rounded max-w-[70%] ${
              msg.SenderId === buyerId
                ? "bg-orange-100 self-end"
                : "bg-gray-100 self-start"
            }`}
          >
            {msg.Content}
            <div className="text-xs text-gray-400 mt-1 text-right">
              {new Date(msg.SentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex p-2 border-t gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-orange-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Nhập tin nhắn..."
        />
        <button
          onClick={sendMessage}
          className="bg-orange-500 text-white px-3 py-1 rounded"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
