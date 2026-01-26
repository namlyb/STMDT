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
    IsActive: 1, // mặc định active
    gender: "m", // mặc định male
    roleId: 2,   // mặc định buyer
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

    // date of birth: phải trong quá khứ
  const today = new Date();
  const dob = new Date(form.dateOfBirth);

  // reset giờ để so sánh chính xác
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
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Đăng ký tài khoản</h2>

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          name="identityNumber"
          placeholder="Identity Number"
          value={form.identityNumber}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="date"
          name="dateOfBirth"
          value={form.dateOfBirth}
          onChange={handleChange}
          className="w-full p-3 border rounded"
          required
        />

        <div className="flex gap-4 justify-center">
          <label className="flex items-center gap-1">
            <input className="cursor-pointer"
              type="radio"
              name="gender"
              value="m"
              checked={form.gender === "m"}
              onChange={handleChange}
            />{" "}
            Male
          </label>
          <label className="flex items-center gap-1">
            <input className="cursor-pointer"
              type="radio"
              name="gender"
              value="f"
              checked={form.gender === "f"}
              onChange={handleChange}
            />{" "}
            Female
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-3 rounded hover:bg-orange-400 transition-colors cursor-pointer"
        >
          Đăng ký
        </button>
      </form>
    </div>
  );
}
