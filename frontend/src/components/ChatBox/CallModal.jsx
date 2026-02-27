import { useState, useEffect, useRef } from "react";
import {
  FaPhone,
  FaVideo,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
  FaTimes,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";
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
  useEffect(() => {
    if (call) {
      console.log("📞 CallModal - call type:", call.Type);
    }
  }, [call]);

  const [callStatus, setCallStatus] = useState(() =>
    isIncoming ? "ringing" : call?.Status || "initiated"
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
  const signalQueue = useRef([]);
  const isWebRTCReadyRef = useRef(false);
  const initPromiseRef = useRef(null);
  const offerCreatedRef = useRef(false);

  // Gán remote stream cho video element và điều khiển mute
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = 1.0;
      remoteVideoRef.current.muted = !isSpeakerOn; // mute theo state
      console.log("🔊 Remote video element set, muted:", remoteVideoRef.current.muted);
    }
  }, [remoteStream, isSpeakerOn]);

  const processSignal = async (signal) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("❌ processSignal: peer connection not available, signal dropped", signal);
      return;
    }
    try {
      const { signalType, signalData, senderId } = signal;
      if (senderId === currentUserId) return;

      console.log(`📥 Processing signal: ${signalType}`);

      if (signalType === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
      } else if (signalType === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalType === "ice-candidate") {
        if (signalData) {
          console.log("📥 Adding ICE candidate:", signalData.candidate);
          await pc.addIceCandidate(new RTCIceCandidate(signalData));
        }
      }
    } catch (err) {
      console.error("❌ Signal processing error:", err);
    }
  };

  const sendSignal = async (signalType, signalData) => {
    try {
      await axios.post("/calls/signal", {
        callId: call.CallId,
        senderId: currentUserId,
        signalType,
        signalData,
      });
      console.log(`📤 Signal sent: ${signalType}`);
    } catch (error) {
      console.error("❌ Send signal error:", error);
    }
  };

  const initializeWebRTC = async () => {
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }

        const iceServers = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        };

        peerConnectionRef.current = new RTCPeerConnection(iceServers);

        // Tăng chất lượng video: constraints cao hơn
        const constraints = {
          audio: true,
          video: call.Type === "video"
            ? {
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 30, max: 60 },
              }
            : false,
        };
        console.log("Requesting media with constraints:", constraints);

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Local stream obtained");
        console.log(" - Audio tracks:", stream.getAudioTracks().length);
        console.log(" - Video tracks:", stream.getVideoTracks().length);

        setLocalStream(stream);
        if (localVideoRef.current && call.Type === "video") {
          localVideoRef.current.srcObject = stream;
        }

        // Thêm track vào peer connection
        stream.getTracks().forEach((track) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, stream);
          }
        });

        peerConnectionRef.current.ontrack = (event) => {
          console.log("✅ ontrack - received remote stream", event.streams[0]);
          console.log("Remote stream tracks:", event.streams[0].getTracks().map(t => t.kind));
          setRemoteStream(event.streams[0]);
        };

        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("📤 Sending ICE candidate:", event.candidate.candidate);
            sendSignal("ice-candidate", event.candidate);
          }
        };

        peerConnectionRef.current.oniceconnectionstatechange = () => {
          console.log(
            "🔄 ICE connection state:",
            peerConnectionRef.current?.iceConnectionState
          );
          if (
            peerConnectionRef.current?.iceConnectionState === "connected" ||
            peerConnectionRef.current?.iceConnectionState === "completed"
          ) {
            setCallStatus("active");
          }
        };

        peerConnectionRef.current.onsignalingstatechange = () => {
          console.log("🔄 Signaling state:", peerConnectionRef.current?.signalingState);
        };

        isWebRTCReadyRef.current = true;
        console.log("✅ WebRTC initialized and ready");

        if (signalQueue.current.length > 0) {
          console.log(
            `🚀 Processing ${signalQueue.current.length} queued signals after init`
          );
          const queueCopy = [...signalQueue.current];
          signalQueue.current = [];
          for (const sig of queueCopy) {
            await processSignal(sig);
          }
        }
      } catch (error) {
        console.error("❌ WebRTC init error:", error);
        isWebRTCReadyRef.current = false;
        initPromiseRef.current = null;
        alert("Không thể truy cập microphone/camera. Vui lòng kiểm tra quyền truy cập.");
        handleEndCall("missed");
        throw error;
      }
    })();

    return initPromiseRef.current;
  };

  const createOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("❌ PeerConnection not initialized");
      return;
    }
    try {
      console.log("📞 Creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: call.Type === "video",
      });
      await pc.setLocalDescription(offer);
      console.log("📤 Sending offer");
      await sendSignal("offer", offer);
    } catch (error) {
      console.error("❌ Create offer error:", error);
    }
  };

  const handleEndCall = async (reason = "ended") => {
    clearInterval(intervalRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    try {
      await axios.post("/calls/end", {
        callId: call.CallId,
        duration: duration,
        reason: reason,
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
    await handleEndCall("rejected");
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
    if (localStream && call.Type === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      const newMuted = !remoteVideoRef.current.muted;
      remoteVideoRef.current.muted = newMuted;
      setIsSpeakerOn(!newMuted);
      console.log("🔊 Speaker toggled, muted:", newMuted);
    } else {
      console.warn("remoteVideoRef not ready");
    }
  };

  useEffect(() => {
    if (callStatus === "active") {
      intervalRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [callStatus]);

  useEffect(() => {
    if (isOpen && socket && call) {
      socket.emit("joinCall", call.CallId);
      console.log("Joined call room:", call.CallId);
    }
  }, [isOpen, socket, call]);

  useEffect(() => {
    if (!isOpen || !call || !socket) return;

    const handleSignal = (signal) => {
      console.log(
        `📥 Received signal: ${signal.signalType} (ready: ${isWebRTCReadyRef.current})`
      );
      if (!isWebRTCReadyRef.current) {
        console.log("📥 Signal queued because WebRTC not ready");
        signalQueue.current.push(signal);
      } else {
        processSignal(signal);
      }
    };

    const handleCallAccepted = (updatedCall) => {
      if (updatedCall.CallId === call.CallId) {
        console.log("📞 Call accepted by receiver");
        setCallStatus("active");
        if (!isIncoming && isWebRTCReadyRef.current && !offerCreatedRef.current) {
          createOffer();
          offerCreatedRef.current = true;
        }
      }
    };

    socket.on("webrtcSignal", handleSignal);
    socket.on("callAccepted", handleCallAccepted);

    if (!isIncoming && !initPromiseRef.current) {
      initializeWebRTC().then(() => {
        if (callStatus === "active" && isWebRTCReadyRef.current && !offerCreatedRef.current) {
          createOffer();
          offerCreatedRef.current = true;
        }
      });
    }

    return () => {
      socket.off("webrtcSignal", handleSignal);
      socket.off("callAccepted", handleCallAccepted);
    };
  }, [isOpen, call, isIncoming, currentUserId, socket, callStatus]);

  if (!isOpen) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallerInfo = () => (isIncoming ? call.CallerName : call.ReceiverName);
  const getAvatarUrl = (avatar) => {
    const base = API_URL || '';
    if (!avatar) return `${base}/uploads/AccountAvatar/avtDf.png`;
    if (avatar.startsWith('http')) {
      if (window.location.protocol === 'https:' && avatar.startsWith('http://')) {
        return avatar.replace('http://', 'https://');
      }
      return avatar;
    }
    return `${base}/uploads/AccountAvatar/${avatar}`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-full ${
                call.Type === "video" ? "bg-purple-500/20" : "bg-blue-500/20"
              }`}
            >
              {call.Type === "video" ? (
                <FaVideo className="text-2xl text-purple-400" />
              ) : (
                <FaPhone className="text-2xl text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {call.Type === "video" ? "Video Call" : "Voice Call"}
              </h2>
              <p className="text-gray-400">
                {callStatus === "active"
                  ? `Đang kết nối - ${formatDuration(duration)}`
                  : callStatus === "ringing"
                  ? "Đang đổ chuông..."
                  : "Đang kết nối..."}
              </p>
            </div>
          </div>

          {callStatus === "active" && (
            <div className="text-right">
              <p className="text-white font-medium">{getCallerInfo()}</p>
              <p className="text-sm text-gray-400">
                {call.Type === "video" ? "Video call" : "Voice call"}
              </p>
            </div>
          )}
        </div>

        {/* Video Area */}
        <div className="relative p-6 flex flex-col md:flex-row gap-6">
          {/* Remote Video */}
          <div className="flex-1 relative bg-black rounded-xl overflow-hidden min-h-[400px]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {(!remoteStream || call.Type !== "video") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50">
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <img
                    src={getAvatarUrl(isIncoming ? call.CallerAvatar : call.ReceiverAvatar)}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{getCallerInfo()}</h3>
                <p className="text-gray-400">
                  {callStatus === "ringing" ? "Đang gọi..." : "Đang kết nối..."}
                </p>
              </div>
            )}

            {/* Local Video Preview */}
            {call.Type === "video" && localStream && (
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
                  {callStatus === "active" ? "Cuộc gọi đang diễn ra" : "Thông tin cuộc gọi"}
                </h3>
                <p className="text-gray-300">
                  {isIncoming ? "Cuộc gọi đến từ" : "Đang gọi cho"}{" "}
                  <span className="font-bold">{getCallerInfo()}</span>
                </p>
              </div>

              {/* Call Controls */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleMicrophone}
                  className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isMuted
                      ? "bg-red-500/20 hover:bg-red-500/30"
                      : "bg-blue-500/20 hover:bg-blue-500/30"
                  }`}
                >
                  <div className={`p-3 rounded-full ${isMuted ? "bg-red-500" : "bg-blue-500"}`}>
                    {isMuted ? (
                      <FaMicrophoneSlash className="text-xl text-white" />
                    ) : (
                      <FaMicrophone className="text-xl text-white" />
                    )}
                  </div>
                  <span className="mt-2 text-sm text-white">
                    {isMuted ? "Bật mic" : "Tắt mic"}
                  </span>
                </button>

                <button
                  onClick={toggleSpeaker}
                  className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                    !isSpeakerOn
                      ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                      : "bg-green-500/20 hover:bg-green-500/30"
                  }`}
                >
                  <div
                    className={`p-3 rounded-full ${!isSpeakerOn ? "bg-yellow-500" : "bg-green-500"}`}
                  >
                    {!isSpeakerOn ? (
                      <FaVolumeMute className="text-xl text-white" />
                    ) : (
                      <FaVolumeUp className="text-xl text-white" />
                    )}
                  </div>
                  <span className="mt-2 text-sm text-white">
                    {!isSpeakerOn ? "Bật loa" : "Tắt loa"}
                  </span>
                </button>

                {call.Type === "video" && (
                  <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                      !isVideoOn
                        ? "bg-red-500/20 hover:bg-red-500/30"
                        : "bg-purple-500/20 hover:bg-purple-500/30"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full ${!isVideoOn ? "bg-red-500" : "bg-purple-500"}`}
                    >
                      {!isVideoOn ? (
                        <FaVideoSlash className="text-xl text-white" />
                      ) : (
                        <FaVideo className="text-xl text-white" />
                      )}
                    </div>
                    <span className="mt-2 text-sm text-white">
                      {!isVideoOn ? "Bật camera" : "Tắt camera"}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {callStatus === "ringing" && isIncoming ? (
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
                    onClick={() => handleEndCall()}
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
                      {call.Type === "video" ? "Video Call" : "Voice Call"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="text-white font-medium">
                      {callStatus === "active"
                        ? "Đang kết nối"
                        : callStatus === "ringing"
                        ? "Đang đổ chuông"
                        : "Đang thiết lập"}
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