export default function ChatSidebar({ chats, selectedChat, onSelect }) {
  return (
    <div className="w-48 border-r overflow-y-auto bg-white">
      {chats.map(chat => (
        <div
          key={chat.ChatId}
          onClick={() => onSelect(chat)}
          className={`flex gap-3 p-2 cursor-pointer border-b ${selectedChat?.ChatId === chat.ChatId ? "bg-orange-50" : "hover:bg-gray-100"}`}
        >
          <img src={chat.Avt || "/default-avatar.png"} className="w-9 h-9 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{chat.SellerName}</p>
            <p className={`text-xs truncate ${chat.UnreadCount > 0 ? "font-bold text-black" : "text-gray-500"}`}>
              {chat.LastMessage || "Chưa có tin nhắn"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
