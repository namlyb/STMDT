import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../config";
import AdminLayout from "../../components/Admin/Sidebar.jsx";

export default function UpdateAccount() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    Username: "",
    Name: "",
    Phone: "",
    Password: "",
    RoleId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Lấy danh sách role
        const rolesRes = await fetch(`${API_URL}/api/roles`);
        if (!rolesRes.ok) throw new Error("Không thể lấy danh sách roles");
        const rolesData = await rolesRes.json();

        // 2. Lấy thông tin account
        const accRes = await fetch(`${API_URL}/api/accounts/${id}`);
        if (!accRes.ok) throw new Error("Không tìm thấy tài khoản");
        const acc = await accRes.json();

        setRoles(rolesData);
        setAccount(acc);

        // 3. Set form với dữ liệu account
        setForm({
          Username: acc.Username || "",
          Name: acc.Name || "",
          Phone: acc.Phone || "",
          Password: "", // để trống nếu không đổi
          RoleId: acc.RoleId?.toString() || "", // convert RoleId sang string
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form };
      if (!body.Password) delete body.Password; // không update nếu password trống

      const res = await fetch(`${API_URL}/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Cập nhật thất bại");
      }

      alert("Cập nhật thành công!");
      navigate("/admin/accounts");
    } catch (err) {
      console.error(err);
      alert(err.message || "Cập nhật thất bại");
    }
  };

  if (loading) return <p className="text-center mt-6">Đang tải dữ liệu...</p>;
  if (!account) return <p className="text-center mt-6">Không tìm thấy tài khoản</p>;

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6">Cập nhật tài khoản</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 font-semibold">Username</label>
            <input
              type="text"
              name="Username"
              value={form.Username}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Name</label>
            <input
              type="text"
              name="Name"
              value={form.Name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Phone</label>
            <input
              type="text"
              name="Phone"
              value={form.Phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Password (để trống nếu không đổi)</label>
            <input
              type="password"
              name="Password"
              value={form.Password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Role</label>
            <select
              name="RoleId"
              value={form.RoleId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {roles.map((role) => (
                <option key={role.RoleId} value={role.RoleId.toString()}>
                  {role.RoleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between gap-4 mt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/accounts")}
              className="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
