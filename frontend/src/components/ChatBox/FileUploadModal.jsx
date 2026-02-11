import { useState, useRef } from "react";
import axios from "../lib/axios";
import { API_URL } from "../../config";
import { FaFile, FaImage, FaVideo, FaMusic, FaArchive, FaTimes, FaPaperclip } from "react-icons/fa";

const FileUploadModal = ({ chatId, senderId, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (mimeType.startsWith('video/')) return <FaVideo className="text-red-500" />;
    if (mimeType.startsWith('audio/')) return <FaMusic className="text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FaArchive className="text-yellow-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Kiểm tra kích thước file (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File vượt quá 10MB. Vui lòng chọn file nhỏ hơn.");
      return;
    }

    setError("");
    setFile(selectedFile);

    // Tạo preview cho ảnh
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
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
        content: '',
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
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gửi File</h3>
          <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>

        <div className="p-4">
          {!file ? (
            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <FaPaperclip className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nhấn để chọn file</p>
              <p className="text-sm text-gray-400 mt-2">
                Hỗ trợ: ảnh, video, audio, zip, pdf, word, excel...
              </p>
              <p className="text-sm text-gray-400">Tối đa 10MB</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={uploading}
                >
                  <FaTimes />
                </button>
              </div>

              {preview && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-contain bg-gray-100"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-center text-gray-600">
                    Đang upload: {progress}%
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={uploading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Đang gửi...' : 'Gửi file'}
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