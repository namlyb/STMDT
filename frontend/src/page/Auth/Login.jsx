import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("/accounts/login", { username, password });
      const { account, token } = res.data;

      // Lưu token vào sessionStorage
    sessionStorage.setItem("token", token);
      sessionStorage.setItem("account", JSON.stringify(account));
      // Chuyển hướng theo role
      switch (account.RoleId) {
        case '1':
          navigate("/admin/accounts");
          break;
        case '2':
          navigate("/profile");
          break;
        case '3':
          navigate("/seller/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Đăng nhập</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 border rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 cursor-pointer"
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
