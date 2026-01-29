import { useEffect, useState } from "react";
import axios from "../../components/lib/axios";
import AdminLayout from "../../components/Admin/Sidebar";
import { FiInfo, FiAlertCircle } from "react-icons/fi";

const PlatformFee = () => {
  const [fees, setFees] = useState([]);
  const [editingFee, setEditingFee] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({ 
    PercentValue: "", 
    MinOrderValue: "", 
    MaxOrderValue: "", 
    Description: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [info, setInfo] = useState("");

  // Fetch danh sách thuế
  const fetchFees = async () => {
    try {
      const endpoint = showInactive ? "/platform-fees/all" : "/platform-fees";
      const res = await axios.get(endpoint);
      setFees(res.data);
      
      // Tính toán thông tin khoảng giá
      if (res.data.length > 0) {
        const sortedFees = [...res.data].sort((a, b) => a.MinOrderValue - b.MinOrderValue);
        const gaps = [];
        
        for (let i = 0; i < sortedFees.length - 1; i++) {
          const current = sortedFees[i];
          const next = sortedFees[i + 1];
          
          if (current.MaxOrderValue !== null && next.MinOrderValue !== null) {
            if (next.MinOrderValue > current.MaxOrderValue + 1) {
              gaps.push(`${current.MaxOrderValue + 1} - ${next.MinOrderValue - 1}`);
            }
          }
        }
        
        if (gaps.length > 0) {
          setInfo(`⚠️ Có khoảng trống: ${gaps.join(', ')}đ`);
        } else {
          setInfo("✅ Các khoảng thuế đã được sắp xếp sát nút");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tải danh sách thuế");
    }
  };

  useEffect(() => {
    fetchFees();
  }, [showInactive]);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ 
      ...form, 
      [name]: value 
    });
    
    // Xóa lỗi khi người dùng bắt đầu nhập
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.PercentValue) {
      newErrors.PercentValue = "Vui lòng nhập phần trăm thuế";
    } else {
      const percent = parseFloat(form.PercentValue);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        newErrors.PercentValue = "Phần trăm thuế phải từ 0-100%";
      }
    }
    
    if (!form.MinOrderValue) {
      newErrors.MinOrderValue = "Vui lòng nhập giá trị tối thiểu";
    } else {
      const min = parseInt(form.MinOrderValue);
      if (isNaN(min) || min < 0) {
        newErrors.MinOrderValue = "Giá trị tối thiểu không được âm";
      }
    }
    
    if (form.MaxOrderValue) {
      const min = parseInt(form.MinOrderValue);
      const max = parseInt(form.MaxOrderValue);
      if (!isNaN(min) && !isNaN(max) && max <= min) {
        newErrors.MaxOrderValue = "Giá trị tối đa phải lớn hơn giá trị tối thiểu";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Tạo mới hoặc cập nhật
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const feeData = {
        ...form,
        PercentValue: parseFloat(form.PercentValue),
        MinOrderValue: parseInt(form.MinOrderValue),
        MaxOrderValue: form.MaxOrderValue ? parseInt(form.MaxOrderValue) : null,
        Description: form.Description || `Áp dụng cho đơn hàng từ ${parseInt(form.MinOrderValue).toLocaleString()}đ${form.MaxOrderValue ? ` đến ${parseInt(form.MaxOrderValue).toLocaleString()}đ` : ' trở lên'}`
      };

      if (editingFee) {
        await axios.put(`/platform-fees/${editingFee.FeeId}`, feeData);
      } else {
        await axios.post("/platform-fees", feeData);
      }
      
      resetForm();
      fetchFees();
    } catch (error) {
      console.error(error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Có lỗi xảy ra");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({ 
      PercentValue: "", 
      MinOrderValue: "", 
      MaxOrderValue: "", 
      Description: ""
    });
    setEditingFee(null);
    setErrors({});
  };

  // Chỉnh sửa
  const handleEdit = (fee) => {
    setEditingFee(fee);
    setForm({ 
      PercentValue: fee.PercentValue.toString(),
      MinOrderValue: fee.MinOrderValue.toString(),
      MaxOrderValue: fee.MaxOrderValue ? fee.MaxOrderValue.toString() : "",
      Description: fee.Description || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Xóa mềm
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mức thuế này?\nSau khi xóa, cần kiểm tra lại các khoảng giá trị để đảm bảo không có khoảng trống.")) return;
    try {
      await axios.delete(`/platform-fees/${id}`);
      fetchFees();
      alert("Đã xóa mức thuế");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    }
  };

  // Kích hoạt lại
  const handleActivate = async (id) => {
    try {
      await axios.put(`/platform-fees/activate/${id}`);
      fetchFees();
      alert("Đã kích hoạt lại mức thuế");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  };

  // Format khoảng giá trị
  const formatRange = (min, max) => {
    if (max === null) {
      return `≥ ${formatCurrency(min)}`;
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  // Tính đề xuất giá trị Min tiếp theo
  const getSuggestedMin = () => {
    if (fees.length === 0) return 0;
    
    const activeFees = fees.filter(fee => fee.Status).sort((a, b) => a.MinOrderValue - b.MinOrderValue);
    if (activeFees.length === 0) return 0;
    
    const lastFee = activeFees[activeFees.length - 1];
    if (lastFee.MaxOrderValue === null) {
      return lastFee.MinOrderValue + 1;
    }
    return lastFee.MaxOrderValue + 1;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-orange-500">Quản lý thuế sàn theo khoảng giá</h1>
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="px-4 py-2 bg-gray-200 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer transition-colors"
          >
            {showInactive ? "Ẩn đã xóa" : "Hiển thị đã xóa"}
          </button>
        </div>

        {/* Form thêm/cập nhật */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            {editingFee ? `Cập nhật mức thuế #${editingFee.FeeId}` : "Thêm mức thuế mới"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Phần trăm thuế */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phần trăm thuế (%) *
                </label>
                <input
                  type="number"
                  name="PercentValue"
                  value={form.PercentValue}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-orange-300 focus:border-transparent ${
                    errors.PercentValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ví dụ: 5.5"
                  min="0"
                  max="100"
                  step="0.1"
                />
                {errors.PercentValue && (
                  <p className="text-red-500 text-sm mt-1">{errors.PercentValue}</p>
                )}
              </div>

              {/* Giá trị tối thiểu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị đơn hàng tối thiểu (đ) *
                </label>
                <input
                  type="number"
                  name="MinOrderValue"
                  value={form.MinOrderValue}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-orange-300 focus:border-transparent ${
                    errors.MinOrderValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={!editingFee ? `Gợi ý: ${getSuggestedMin()}` : "Ví dụ: 0"}
                  min="0"
                />
                {errors.MinOrderValue && (
                  <p className="text-red-500 text-sm mt-1">{errors.MinOrderValue}</p>
                )}
              </div>

              {/* Giá trị tối đa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị đơn hàng tối đa (đ)
                </label>
                <input
                  type="number"
                  name="MaxOrderValue"
                  value={form.MaxOrderValue}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-orange-300 focus:border-transparent ${
                    errors.MaxOrderValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Để trống nếu không giới hạn"
                  min="0"
                />
                {errors.MaxOrderValue && (
                  <p className="text-red-500 text-sm mt-1">{errors.MaxOrderValue}</p>
                )}
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <input
                  type="text"
                  name="Description"
                  value={form.Description}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                  placeholder="Ví dụ: Áp dụng cho đơn hàng từ 0đ đến 100,000đ"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-orange-400 text-white rounded-lg cursor-pointer hover:bg-orange-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : editingFee ? "Cập nhật" : "Thêm mới"}
              </button>
              {editingFee && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-200 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Danh sách thuế */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-orange-400 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">
              Danh sách mức thuế ({fees.length})
            </h2>
            <div className="text-sm text-white">
              {fees.filter(f => f.Status).length} mức đang hoạt động
            </div>
          </div>
          
          {fees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có mức thuế nào được thiết lập
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-gray-700">ID</th>
                    <th className="p-3 text-left text-gray-700">Phần trăm</th>
                    <th className="p-3 text-left text-gray-700">Khoảng giá</th>
                    <th className="p-3 text-left text-gray-700">Mô tả</th>
                    <th className="p-3 text-left text-gray-700">Trạng thái</th>
                    <th className="p-3 text-left text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee, index) => {
                    // Kiểm tra khoảng trống với mục tiếp theo
                    const nextFee = fees[index + 1];
                    let hasGap = false;
                    if (nextFee && fee.Status && nextFee.Status) {
                      if (fee.MaxOrderValue !== null && nextFee.MinOrderValue !== null) {
                        hasGap = nextFee.MinOrderValue > fee.MaxOrderValue + 1;
                      }
                    }
                    
                    return (
                      <tr 
                        key={fee.FeeId} 
                        className={`border-b hover:bg-gray-50 ${
                          !fee.Status ? 'bg-gray-100 opacity-75' : ''
                        } ${hasGap ? 'bg-yellow-50' : ''}`}
                      >
                        <td className="p-3">
                          <div className="font-medium">{fee.FeeId}</div>
                          {hasGap && (
                            <div className="mt-1">
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                Có khoảng trống
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-orange-600">
                          {fee.PercentValue}%
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            {formatRange(fee.MinOrderValue, fee.MaxOrderValue)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {fee.Description}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Tạo: {new Date(fee.CreatedAt).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="p-3">
                          {fee.Status ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                              Đã xóa
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {fee.Status ? (
                              <>
                                <button
                                  onClick={() => handleEdit(fee)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 cursor-pointer rounded hover:bg-blue-200 transition-colors text-sm"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDelete(fee.FeeId)}
                                  className="px-3 py-1 bg-red-100 text-red-700 cursor-pointer rounded hover:bg-red-200 transition-colors text-sm"
                                >
                                  Xóa
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleActivate(fee.FeeId)}
                                className="px-3 py-1 bg-green-100 text-green-700 cursor-pointer rounded hover:bg-green-200 transition-colors text-sm"
                              >
                                Kích hoạt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PlatformFee;