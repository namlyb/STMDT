import { useState, useRef } from "react";
import axios from "../lib/axios";
import { FaFile, FaImage, FaVideo, FaMusic, FaArchive, FaTimes, FaPaperclip, FaTrash, FaRegFile } from "react-icons/fa";

const FileUploadModal = ({ chatId, senderId, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [messageContent, setMessageContent] = useState("");

  const getFileIcon = (mimeType, fileName) => {
    if (mimeType.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (mimeType.startsWith('video/')) return <FaVideo className="text-red-500" />;
    if (mimeType.startsWith('audio/')) return <FaMusic className="text-green-500" />;
    if (fileName?.endsWith('.pdf')) return <FaFile className="text-red-500" />;
    if (fileName?.endsWith('.doc') || fileName?.endsWith('.docx')) return <FaFile className="text-blue-500" />;
    if (fileName?.endsWith('.xls') || fileName?.endsWith('.xlsx')) return <FaFile className="text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FaArchive className="text-yellow-500" />;
    return <FaRegFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDefaultContentByType = (fileType, fileName) => {
    if (fileType.startsWith('image/')) return `Đã gửi một ảnh`;
    if (fileType.startsWith('video/')) return `Đã gửi một video`;
    if (fileType.startsWith('audio/')) return `Đã gửi một audio`;
    return fileName || "Đã gửi một file";
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    
    // Validate: chỉ cho phép chọn 1 file
    if (selectedFiles.length > 1) {
      setError("Chỉ được chọn 1 file mỗi lần.");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const selectedFile = selectedFiles[0];
    if (!selectedFile) return;

    // Kiểm tra kích thước file (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File vượt quá 10MB. Vui lòng chọn file nhỏ hơn.");
      return;
    }

    setError("");
    setFile(selectedFile);
    
    // Đặt nội dung mặc định theo loại file
    setMessageContent(getDefaultContentByType(selectedFile.type, selectedFile.name));

    // Tạo preview cho ảnh
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setPreview('video');
    } else if (selectedFile.type.startsWith('audio/')) {
      setPreview('audio');
    } else {
      setPreview('file');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setMessageContent("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', senderId);
    formData.append('chatId', chatId);

    try {
      // 1. Upload file
      const uploadRes = await axios.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      // 2. Gửi tin nhắn với file
      const messageRes = await axios.post('/messages/file', {
        chatId,
        senderId,
        content: messageContent.trim() || null, // Gửi null nếu không có nội dung
        fileId: uploadRes.data.fileId,
      });

      onSuccess(messageRes.data);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Upload file thất bại. Vui lòng thử lại.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setMessageContent("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[99999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-800">Gửi File</h3>
          <button 
            onClick={handleCancel} 
            className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            disabled={uploading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-4">
          {!file ? (
            // Dropzone khi chưa chọn file
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <FaPaperclip className="text-3xl text-blue-400" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">Chọn file để gửi</p>
                  <p className="text-sm text-gray-500 mb-2">Kéo thả hoặc nhấn để chọn</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 rounded">Ảnh</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">Video</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">Audio</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                />
              </div>
              
              <div className="text-center text-sm text-gray-500">
                <p>Hỗ trợ các định dạng phổ biến</p>
                <p>Tối đa 10MB • Chỉ 1 file mỗi lần</p>
              </div>
            </div>
          ) : (
            // Preview khi đã chọn file
            <div className="space-y-4">
              {/* File Preview */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getFileIcon(file.type, file.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 text-gray-400 cursor-pointer hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    disabled={uploading}
                  >
                    <FaTrash />
                  </button>
                </div>

                {/* File Preview Content */}
                {preview === 'video' && (
                  <div className="mt-3 rounded-lg overflow-hidden bg-black/5">
                    <div className="p-4 flex items-center justify-center">
                      <FaVideo className="text-4xl text-gray-400" />
                    </div>
                  </div>
                )}
                
                {preview === 'audio' && (
                  <div className="mt-3 rounded-lg overflow-hidden bg-black/5">
                    <div className="p-4 flex items-center justify-center">
                      <FaMusic className="text-4xl text-gray-400" />
                    </div>
                  </div>
                )}
                
                {preview === 'file' && (
                  <div className="mt-3 rounded-lg overflow-hidden bg-black/5">
                    <div className="p-4 flex items-center justify-center">
                      {getFileIcon(file.type, file.name)}
                    </div>
                  </div>
                )}
                
                {typeof preview === 'string' && preview.startsWith('data:image') && (
                  <div className="mt-3 rounded-lg overflow-hidden border">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Message Content Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung tin nhắn (tuỳ chọn)
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Thêm nội dung cho tin nhắn..."
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={uploading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Đang tải lên...</span>
                    <span className="text-blue-600 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 px-4 border cursor-pointer border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-2.5 px-4 cursor-pointer bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {uploading ? 'Đang gửi...' : 'Gửi ngay'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;