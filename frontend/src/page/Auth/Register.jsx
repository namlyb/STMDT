import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    identityNumber: "",
    dateOfBirth: "",
    IsActive: 1,
    gender: "m",
    roleId: 2,
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const password = form.password.trim();
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!-/:-@\[-`\{-~]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái, số và ký tự đặc biệt!");
      return;
    }

    if (password !== form.confirmPassword) {
      setError("Password và Confirm Password không khớp");
      return;
    }

    if (form.phone.length !== 10 || !/^0\d{9}$/.test(form.phone)) {
      setError("Số điện thoại không hợp lệ!");
      return;
    }

    if (form.identityNumber.length !== 12 || !/^\d+$/.test(form.identityNumber)) {
      setError("Số CMND/CCCD không hợp lệ!");
      return;
    }

    const today = new Date();
    const dob = new Date(form.dateOfBirth);
    today.setHours(0, 0, 0, 0);
    dob.setHours(0, 0, 0, 0);

    if (dob >= today) {
      setError("Ngày sinh không thể lớn hơn hiện tại!");
      return;
    }

    try {
      await axios.post(`${API_URL}/api/accounts/register`, form);
      alert("Đăng ký thành công!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-gray-900">
            Đăng ký tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{" "}
            <a
              href="/login"
              className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
            >
              đăng nhập
            </a>
            {" "}nếu đã có tài khoản
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Họ và tên
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Số điện thoại
              </label>
              <input
                id="phone"
                type="text"
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Identity Number */}
            <div>
              <label
                htmlFor="identityNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                CMND/CCCD
              </label>
              <input
                id="identityNumber"
                type="text"
                name="identityNumber"
                placeholder="Identity Number"
                value={form.identityNumber}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ngày sinh
              </label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới tính
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="m"
                    checked={form.gender === "m"}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Nam</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="f"
                    checked={form.gender === "f"}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Nữ</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r 
              from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-orange-500 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
            >
              Đăng ký
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-gray-800 bg-gray-200 hover:bg-gray-300 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}