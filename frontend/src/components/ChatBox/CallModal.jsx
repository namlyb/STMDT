import { useState, useEffect, useRef } from "react";
import { FaPhone, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaTimes, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import axios from "../lib/axios";
import { API_URL } from "../../config";

const CallModal = ({
  call,
  currentUserId,
  isIncoming = false,
  onEndCall,
  onRejectCall,
  onAcceptCall,
  isOpen,
  socket,
}) => {
  const [callStatus, setCallStatus] = useState(() => 
    isIncoming ? 'ringing' : (call?.Status || 'initiated')
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const intervalRef = useRef(null);
  const [isWebRTCInitialized, setIsWebRTCInitialized] = useState(false);

  // Cập nhật callStatus khi prop call thay đổi
  useEffect(() => {
    if (call) {
      setCallStatus(call.Status);
    }
  }, [call]);

  // Cập nhật duration khi callStatus === 'active'
  useEffect(() => {
    if (callStatus === 'active') {
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [callStatus]);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }
    ]
  };

  const initializeWebRTC = async () => {
    try {
      // Nếu đã có peer connection và đang ở trạng thái mở, đóng lại trước
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      const constraints = {
        audio: true,
        video: call.Type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current && call.Type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteStream(event.streams[0]);
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('ice-candidate', event.candidate);
        }
      };

      peerConnectionRef.current.onconnectionstatechange = () => {
        if (peerConnectionRef.current?.connectionState === 'connected') {
          setCallStatus('active');
        }
      };

      setIsWebRTCInitialized(true);
    } catch (error) {
      console.error("WebRTC init error:", error);
      setIsWebRTCInitialized(false);
      // Thông báo lỗi và kết thúc cuộc gọi
      alert("Không thể truy cập microphone/camera. Vui lòng kiểm tra quyền truy cập.");
      handleEndCall();
    }
  };

  const sendSignal = async (signalType, signalData) => {
    try {
      await axios.post('/calls/signal', {
        callId: call.CallId,
        senderId: currentUserId,
        signalType,
        signalData
      });
    } catch (error) {
      console.error("Send signal error:", error);
    }
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) {
      console.error("PeerConnection not initialized");
      return;
    }
    try {
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: call.Type === 'video'
      });
      await peerConnectionRef.current.setLocalDescription(offer);
      await sendSignal('offer', offer);
    } catch (error) {
      console.error("Create offer error:", error);
    }
  };

  const handleEndCall = async () => {
    clearInterval(intervalRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    try {
      await axios.post('/calls/end', {
        callId: call.CallId,
        duration: duration
      });
    } catch (error) {
      console.error("End call API error:", error);
    }
    if (onEndCall) onEndCall();
  };

  const handleAcceptCall = async () => {
    await initializeWebRTC();
    if (onAcceptCall) {
      await onAcceptCall();
    }
  };

  const handleRejectCall = async () => {
    await handleEndCall();
    if (onRejectCall) onRejectCall();
  };

  const toggleMicrophone = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream && call.Type === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerOn(!remoteVideoRef.current.muted);
    }
  };

  // Socket signal handling
  useEffect(() => {
    if (!isOpen || !call || !socket) return;

    socket.emit("joinCall", call.CallId);

    const handleSignal = async (signal) => {
      if (!peerConnectionRef.current) {
        console.warn("Peer connection not ready");
        return;
      }
      try {
        const { signalType, signalData, senderId } = signal;
        if (senderId === currentUserId) return;

        if (signalType === 'offer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          await sendSignal('answer', answer);
        } else if (signalType === 'answer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalType === 'ice-candidate') {
          if (signalData) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signalData));
          }
        }
      } catch (err) {
        console.error("Signal handling error:", err);
      }
    };

    socket.on("webrtcSignal", handleSignal);

    // Nếu là caller và chưa có peer connection, khởi tạo và tạo offer
    if (!isIncoming && !peerConnectionRef.current) {
      initializeWebRTC().then(() => {
        createOffer();
      });
    }

    return () => {
      socket.off("webrtcSignal", handleSignal);
      socket.emit("leaveCall", call.CallId);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null; // ✅ QUAN TRỌNG: set null sau khi đóng
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, call, isIncoming, currentUserId, socket]);

  if (!isOpen) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallerInfo = () => isIncoming ? call.CallerName : call.ReceiverName;
  const getAvatarUrl = (avatar) => avatar ? `${API_URL}/uploads/AccountAvatar/${avatar}` : `${API_URL}/uploads/AccountAvatar/avtDf.png`;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${call.Type === 'video' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
              {call.Type === 'video' ? (
                <FaVideo className="text-2xl text-purple-400" />
              ) : (
                <FaPhone className="text-2xl text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {call.Type === 'video' ? 'Video Call' : 'Voice Call'}
              </h2>
              <p className="text-gray-400">
                {callStatus === 'active' 
                  ? `Đang kết nối - ${formatDuration(duration)}`
                  : callStatus === 'ringing'
                    ? 'Đang đổ chuông...'
                    : 'Đang kết nối...'
                }
              </p>
            </div>
          </div>
          
          {callStatus === 'active' && (
            <div className="text-right">
              <p className="text-white font-medium">{getCallerInfo()}</p>
              <p className="text-sm text-gray-400">
                {call.Type === 'video' ? 'Video call' : 'Voice call'}
              </p>
            </div>
          )}
        </div>

        {/* Video Area */}
        <div className="relative p-6 flex flex-col md:flex-row gap-6">
          {/* Remote Video */}
          <div className="flex-1 relative bg-black rounded-xl overflow-hidden min-h-[400px]">
            {remoteStream && call.Type === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-gray-900/50">
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <img 
                    src={getAvatarUrl(isIncoming ? call.CallerAvatar : call.ReceiverAvatar)}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {getCallerInfo()}
                </h3>
                <p className="text-gray-400">
                  {callStatus === 'ringing' ? 'Đang gọi...' : 'Đang kết nối...'}
                </p>
              </div>
            )}

            {/* Local Video Preview */}
            {call.Type === 'video' && localStream && (
              <div className="absolute bottom-4 right-4 w-40 h-48 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <FaVideoSlash className="text-2xl text-white" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="md:w-80 bg-gray-900/50 rounded-xl p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {callStatus === 'active' ? 'Cuộc gọi đang diễn ra' : 'Thông tin cuộc gọi'}
                </h3>
                <p className="text-gray-300">
                  {isIncoming ? 'Cuộc gọi đến từ' : 'Đang gọi cho'} <span className="font-bold">{getCallerInfo()}</span>
                </p>
              </div>

              {/* Call Controls */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleMicrophone}
                  className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isMuted 
                      ? 'bg-red-500/20 hover:bg-red-500/30' 
                      : 'bg-blue-500/20 hover:bg-blue-500/30'
                  }`}
                >
                  <div className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {isMuted ? (
                      <FaMicrophoneSlash className="text-xl text-white" />
                    ) : (
                      <FaMicrophone className="text-xl text-white" />
                    )}
                  </div>
                  <span className="mt-2 text-sm text-white">
                    {isMuted ? 'Bật mic' : 'Tắt mic'}
                  </span>
                </button>

                <button
                  onClick={toggleSpeaker}
                  className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                    !isSpeakerOn 
                      ? 'bg-yellow-500/20 hover:bg-yellow-500/30' 
                      : 'bg-green-500/20 hover:bg-green-500/30'
                  }`}
                >
                  <div className={`p-3 rounded-full ${!isSpeakerOn ? 'bg-yellow-500' : 'bg-green-500'}`}>
                    {!isSpeakerOn ? (
                      <FaVolumeMute className="text-xl text-white" />
                    ) : (
                      <FaVolumeUp className="text-xl text-white" />
                    )}
                  </div>
                  <span className="mt-2 text-sm text-white">
                    {!isSpeakerOn ? 'Bật loa' : 'Tắt loa'}
                  </span>
                </button>

                {call.Type === 'video' && (
                  <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                      !isVideoOn 
                        ? 'bg-red-500/20 hover:bg-red-500/30' 
                        : 'bg-purple-500/20 hover:bg-purple-500/30'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${!isVideoOn ? 'bg-red-500' : 'bg-purple-500'}`}>
                      {!isVideoOn ? (
                        <FaVideoSlash className="text-xl text-white" />
                      ) : (
                        <FaVideo className="text-xl text-white" />
                      )}
                    </div>
                    <span className="mt-2 text-sm text-white">
                      {!isVideoOn ? 'Bật camera' : 'Tắt camera'}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {callStatus === 'ringing' && isIncoming ? (
                  <div className="flex gap-4">
                    <button
                      onClick={handleAcceptCall}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaPhone className="rotate-90" />
                      Chấp nhận
                    </button>
                    <button
                      onClick={handleRejectCall}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaTimes />
                      Từ chối
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <FaTimes className="text-xl" />
                    Kết thúc cuộc gọi
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-gray-800">
                <div className="text-sm text-gray-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Loại cuộc gọi:</span>
                    <span className="text-white font-medium">
                      {call.Type === 'video' ? 'Video Call' : 'Voice Call'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="text-white font-medium">
                      {callStatus === 'active' ? 'Đang kết nối' : 
                       callStatus === 'ringing' ? 'Đang đổ chuông' : 'Đang thiết lập'}
                    </span>
                  </div>
                  {duration > 0 && (
                    <div className="flex justify-between">
                      <span>Thời lượng:</span>
                      <span className="text-white font-medium">{formatDuration(duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallModal;