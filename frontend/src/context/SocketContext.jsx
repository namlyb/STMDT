import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Lấy account từ sessionStorage và lắng nghe sự thay đổi
  const [account, setAccount] = useState(() => 
    JSON.parse(sessionStorage.getItem('account'))
  );

  useEffect(() => {
    // Hàm xử lý khi sessionStorage thay đổi
    const handleStorageChange = () => {
      setAccount(JSON.parse(sessionStorage.getItem('account')));
    };

    // Lắng nghe sự kiện storage (khi tab khác thay đổi) và sự kiện tự định nghĩa
    window.addEventListener('storage', handleStorageChange);
    
    // Tạo sự kiện tùy chỉnh để cập nhật khi login/logout cùng tab
    const handleAccountUpdate = () => handleStorageChange();
    window.addEventListener('account-update', handleAccountUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('account-update', handleAccountUpdate);
    };
  }, []);

  // Khởi tạo socket một lần
  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketIo.on('connect', () => {
      console.log('Socket connected:', socketIo.id);
      setIsConnected(true);
    });

    socketIo.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  // Đăng ký user khi socket kết nối và account tồn tại
  useEffect(() => {
    if (socket && isConnected && account?.AccountId) {
      socket.emit('registerUser', account.AccountId);
      console.log('Registered user', account.AccountId);
    }
  }, [socket, isConnected, account?.AccountId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};