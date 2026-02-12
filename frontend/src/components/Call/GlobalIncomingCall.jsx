import { useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import axios from "../lib/axios";
import CallModal from "../ChatBox/CallModal";

export default function GlobalIncomingCall() {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const account = JSON.parse(sessionStorage.getItem("account"));

  // Lắng nghe cuộc gọi đến
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (call) => {
      if (call.ReceiverId === account?.AccountId) {
        setIncomingCall(call);
        setIsOpen(true);
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    return () => {
      socket.off("incomingCall", handleIncomingCall);
    };
  }, [socket, account]);

  // Lắng nghe cập nhật trạng thái cuộc gọi (chấp nhận / kết thúc)
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = (updatedCall) => {
      if (incomingCall?.CallId === updatedCall.CallId) {
        setIncomingCall(updatedCall); // cập nhật status = active
        // không đóng modal
      }
    };

    const handleCallEnded = (updatedCall) => {
      if (incomingCall?.CallId === updatedCall.CallId) {
        setIsOpen(false);
        setIncomingCall(null);
      }
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, incomingCall]);

  const handleAccept = async () => {
    try {
      await axios.post("/calls/accept", {
        callId: incomingCall.CallId,
      });
      // không đóng modal, không navigate
    } catch (error) {
      console.error("Accept call error:", error);
    }
  };

  const handleReject = async () => {
    try {
      await axios.post("/calls/end", {
        callId: incomingCall.CallId,
        duration: 0,
      });
      setIsOpen(false);
      setIncomingCall(null);
    } catch (error) {
      console.error("Reject call error:", error);
    }
  };

  const handleEndCall = async () => {
    await handleReject();
  };

  if (!incomingCall || !isOpen) return null;

  return (
    <CallModal
      call={incomingCall}
      currentUserId={account?.AccountId}
      isIncoming={true}
      isOpen={isOpen}
      onAcceptCall={handleAccept}
      onRejectCall={handleReject}
      onEndCall={handleEndCall}
      socket={socket}
    />
  );
}