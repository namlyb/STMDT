import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import { useNavigate } from "react-router-dom";
import ChatBubble from "../../components/ChatBox/ChatBubble";
import canChat from "../../utils/canChat";
import {
  Trash2, Plus, Minus, ShoppingBag,
  Check, ChevronRight, Loader2, AlertCircle
} from "lucide-react";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);

  const navigate = useNavigate();

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const accStr = sessionStorage.getItem("account");

    if (!accStr) {
      navigate("/login", { replace: true });
      return;
    }

    const acc = JSON.parse(accStr);

    if (String(acc.RoleId) === "1") {
      navigate("/admin/accounts", { replace: true });
      return;
    }

    setAccount(acc);
  }, [navigate]);

  /* ================= FETCH CART ================= */
  useEffect(() => {
    if (!account) return;
    
    setLoading(true);
    axios
      .get("/carts")
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [account]);

  /* ================= TOTAL (FE CHECKBOX) ================= */
  const total = items
    .filter(i => checkedItems.includes(i.CartId))
    .reduce((sum, i) => sum + i.UnitPrice * i.Quantity, 0);

  /* ================= QUANTITY ================= */
  const updateQty = async (item, qty) => {
    if (qty < 1 || qty > 99) return;
    
    setUpdating(item.CartId);
    await axios.patch("/carts/quantity", {
      cartId: item.CartId,
      quantity: qty
    });

    setItems(prev =>
      prev.map(i =>
        i.CartId === item.CartId ? { ...i, Quantity: qty } : i
      )
    );
    setUpdating(null);
  };

  const onChangeQty = (item, value) => {
    if (!/^\d+$/.test(value) || value === "") return;
    const numValue = Number(value);
    if (numValue < 1 || numValue > 99) return;
    updateQty(item, numValue);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (cartId) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    await axios.delete(`/carts/${cartId}`);

    setItems(prev => prev.filter(i => i.CartId !== cartId));
    setCheckedItems(prev => prev.filter(id => id !== cartId));
  };

  /* ================= CHECKBOX ================= */
  const isAllSelected = items.length > 0 && checkedItems.length === items.length;

  const handleSelectAll = (checked) => {
    setCheckedItems(checked ? items.map(i => i.CartId) : []);
  };

  /* ================= CHECKOUT ================= */
  const handleCheckout = async () => {
    if (checkedItems.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán");
      return;
    }

    sessionStorage.setItem("checkoutCartIds", JSON.stringify(checkedItems));
    navigate("/checkout");
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
            <p className="text-gray-600">Đang tải giỏ hàng...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            <ShoppingBag className="inline-block w-8 h-8 mr-3 text-orange-500" />
            Giỏ hàng của bạn
          </h1>
          <p className="text-gray-600 mt-2">
            {account?.Name ? `Xin chào, ${account.Name}!` : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              Giỏ hàng trống
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy khám phá các sản phẩm và bắt đầu mua sắm!
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2">
              {/* Selection Header */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mr-3 transition-all ${isAllSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                        {isAllSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="hidden"
                      />
                      <span className="font-semibold cursor-pointer text-gray-700">
                        Chọn tất cả ({items.length} sản phẩm)
                      </span>
                    </label>
                  </div>
                  <button
                    onClick={() => handleSelectAll(!isAllSelected)}
                    className="text-sm cursor-pointer text-orange-600 hover:text-orange-700 cursor-pointer font-medium"
                  >
                    {isAllSelected ? "Bỏ chọn" : "Chọn tất cả"}
                  </button>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="space-y-4">
                {items.map(item => {
                  const isChecked = checkedItems.includes(item.CartId);
                  const itemTotal = item.UnitPrice * item.Quantity;
                  
                  return (
                    <div
                      key={item.CartId}
                      className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 ${isChecked ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-200'}`}
                    >
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <label className="cursor-pointer">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) => {
                                  setCheckedItems(prev =>
                                    e.target.checked
                                      ? [...prev, item.CartId]
                                      : prev.filter(id => id !== item.CartId)
                                  );
                                }}
                              />
                            </label>
                          </div>

                          {/* Product Image */}
                          <div
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => navigate(`/product/${item.ProductId}`)}
                          >
                            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                              <img
                                src={item.Image}
                                alt={item.ProductName}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <div>
                                <h3
                                  className="font-semibold text-gray-900 hover:text-orange-600 cursor-pointer transition-colors"
                                  onClick={() => navigate(`/product/${item.ProductId}`)}
                                >
                                  {item.ProductName}
                                </h3>
                                {item.Description && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {item.Description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-red-500">
                                  {itemTotal.toLocaleString()}₫
                                </p>
                                <p className="text-sm text-gray-500">
                                  {Number(item.UnitPrice).toLocaleString()}₫ / sản phẩm
                                </p>
                              </div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center border rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => updateQty(item, item.Quantity - 1)}
                                    disabled={updating === item.CartId || item.Quantity <= 1}
                                    className="w-10 h-10 flex items-center cursor-pointer justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  
                                  <div className="w-16">
                                    {updating === item.CartId ? (
                                      <div className="flex justify-center py-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                      </div>
                                    ) : (
                                      <input
                                        value={item.Quantity}
                                        onChange={(e) => onChangeQty(item, e.target.value)}
                                        className="w-full h-10 text-center border-x bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                      />
                                    )}
                                  </div>
                                  
                                  <button
                                    onClick={() => updateQty(item, item.Quantity + 1)}
                                    disabled={updating === item.CartId || item.Quantity >= 99}
                                    className="w-10 h-10 flex items-center cursor-pointer justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(item.CartId)}
                                className="flex items-center text-gray-400 cursor-pointer hover:text-red-500 transition-colors group"
                              >
                                <Trash2 className="w-5 h-5 mr-1 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Xóa</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {/* Order Summary Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b">
                    Tóm tắt đơn hàng
                  </h3>

                  {/* Selected Items */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Sản phẩm đã chọn:</span>
                      <span className="font-semibold">{checkedItems.length} sản phẩm</span>
                    </div>
                    
                    {/* Items List */}
                    <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
                      {items
                        .filter(i => checkedItems.includes(i.CartId))
                        .map(item => (
                          <div key={item.CartId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded overflow-hidden bg-gray-200">
                                <img
                                  src={item.Image}
                                  alt={item.ProductName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-gray-900 line-clamp-1">
                                  {item.ProductName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.Quantity} × {Number(item.UnitPrice).toLocaleString()}₫
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold text-red-500">
                              {(item.UnitPrice * item.Quantity).toLocaleString()}₫
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Tổng tiền:</span>
                      <span className="text-2xl font-bold text-red-500">
                        {total.toLocaleString()}₫
                      </span>
                    </div>
                    
                    {total === 0 && (
                      <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                        <p className="text-sm text-yellow-700">
                          Vui lòng chọn ít nhất 1 sản phẩm để thanh toán
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  disabled={checkedItems.length === 0}
                  onClick={handleCheckout}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3
                    ${checkedItems.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-red-500 cursor-pointer text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                >
                  <span>Tiến hành thanh toán</span>
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Continue Shopping */}
                <button
                  onClick={() => navigate("/")}
                  className="w-full mt-4 py-3 bg-white border-2 cursor-pointer border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-orange-500 hover:text-orange-600 transition-all duration-300"
                >
                  Tiếp tục mua sắm
                </button>

                {/* Security Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-700 text-center">
                    🔒 Thanh toán an toàn • Đảm bảo hoàn tiền • Hỗ trợ 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar for Mobile */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng thanh toán</p>
                <p className="text-xl font-bold text-red-500">
                  {total.toLocaleString()}₫
                </p>
              </div>
              <button
                disabled={checkedItems.length === 0}
                onClick={handleCheckout}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center space-x-2
                  ${checkedItems.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
              >
                <span>Thanh toán</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add padding bottom for mobile */}
      {items.length > 0 && (
        <div className="lg:hidden h-20"></div>
      )}

      {canChat() && <ChatBubble sellerId={null} />}
    </div>
  );
}