import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../components/lib/axios';
import Header from '../../components/Guest/Header';
import Footer from '../../components/Guest/Footer';
import { CreditCard, CheckCircle, AlertCircle, ArrowLeft, Loader } from 'lucide-react';

export default function Payment() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [qrData, setQrData] = useState(null);
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('pending'); // pending, success, failed
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Tạo QR khi vào trang
    useEffect(() => {
        const fetchQR = async () => {
            try {
                const response = await axios.post('/payments/create', { orderId });
                setQrData(response.data.qr);
                setAmount(response.data.amount);
                setDescription(response.data.description);
                setLoading(false);
            } catch (err) {
                console.error('QR error:', err);
                setError(err.response?.data?.message || 'Không thể tạo mã QR');
                setLoading(false);
            }
        };
        fetchQR();
    }, [orderId]);

    // Polling kiểm tra trạng thái thanh toán mỗi 3 giây
    useEffect(() => {
        if (status !== 'pending') return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`/payments/status/${orderId}`);
                if (res.data.orderStatus === 2) { // PROCESSING
                    setStatus('success');
                    clearInterval(interval);
                } else if (res.data.paymentStatus === 'failed') {
                    setStatus('failed');
                    clearInterval(interval);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [orderId, status]);

    // Xử lý khi thanh toán thành công
    if (status === 'success') {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4">
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thành công!</h2>
                        <p className="text-gray-600 mb-6">Đơn hàng #{orderId} đã được xác nhận.</p>
                        <button
                            onClick={() => navigate('/orders')}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
                        >
                            Xem đơn hàng
                        </button>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    // Xử lý khi thất bại
    if (status === 'failed') {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4">
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thất bại</h2>
                        <p className="text-gray-600 mb-6">Vui lòng thử lại hoặc chọn phương thức khác.</p>
                        <button
                            onClick={() => navigate(`/order/${orderId}`)}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition"
                        >
                            Quay lại đơn hàng
                        </button>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6 transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <CreditCard className="w-6 h-6" /> Thanh toán đơn hàng
                            </h1>
                            <p className="opacity-90 mt-1">Mã đơn: #{orderId}</p>
                        </div>

                        <div className="p-8">
                            {loading ? (
                                <div className="text-center py-12">
                                    <Loader className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                                    <p className="text-gray-500">Đang tạo mã thanh toán...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-12">
                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <p className="text-red-600 mb-4">{error}</p>
                                    <button
                                        onClick={() => navigate('/cart')}
                                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                                    >
                                        Về giỏ hàng
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-8">
                                        <p className="text-gray-600 mb-2">Số tiền cần thanh toán</p>
                                        <p className="text-4xl font-bold text-red-500">{amount.toLocaleString('vi-VN')}đ</p>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                        <p className="text-sm text-gray-500 mb-2">Quét mã QR bằng ứng dụng ngân hàng</p>
                                        <div className="flex justify-center">
                                            {qrData && (
                                                <img
                                                    src={qrData.startsWith('http') ? qrData : `data:image/png;base64,${qrData}`}
                                                    alt="QR thanh toán"
                                                    className="w-64 h-64"
                                                />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 text-center mt-4">
                                            Nội dung chuyển khoản: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{description}</span>
                                        </p>
                                    </div>

                                    <div className="border-t border-gray-100 pt-6">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-blue-50 p-4 rounded-xl">
                                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                            <p>
                                                Sau khi chuyển khoản, vui lòng chờ hệ thống xác nhận (thường trong 1-2 phút).
                                                Trang sẽ tự động cập nhật khi thanh toán thành công.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}