import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import AdminLayout from "../../components/Admin/Sidebar.jsx";

export default function ListAccount() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // filter + search
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [gender, setGender] = useState("");
  const [active, setActive] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Fetch accounts
  useEffect(() => {
    fetch(`${API_URL}/api/accounts`)
      .then(res => res.json())
      .then(data => {
        setAccounts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Toggle Active
  const toggleActive = async (accountId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/accounts/${accountId}/active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: currentStatus ? 0 : 1 })
      });

      if (!res.ok) throw new Error("Update failed");

      setAccounts(prev =>
        prev.map(acc =>
          acc.AccountId === accountId
            ? { ...acc, IsActive: currentStatus ? 0 : 1 }
            : acc
        )
      );
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật trạng thái");
    }
  };

  // Filter + Search
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const keyword = search.toLowerCase().trim();

      const matchSearch =
        acc.Username?.toLowerCase().includes(keyword) ||
        acc.Name?.toLowerCase().includes(keyword) ||
        acc.Phone?.includes(keyword) ||
        acc.IdentityNumber?.includes(keyword);

      const matchRole = role ? acc.RoleName === role : true;
      const matchGender = gender ? acc.Gender === gender : true;
      const matchActive = active !== "" ? String(acc.IsActive) === active : true;

      return matchSearch && matchRole && matchGender && matchActive;
    });
  }, [accounts, search, role, gender, active]);

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const pagedData = filteredAccounts.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p className="text-center mt-6">Đang tải dữ liệu...</p>;

  return (
    <AdminLayout>
      <div className="bg-white rounded-xl shadow p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-orange-600">
            👤 Quản lý tài khoản
          </h2>
        </div>

        {/* FILTER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="🔍 Tìm username / tên / SĐT / CCCD"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 cursor-pointer"
            value={role}
            onChange={e => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">👥 Tất cả vai trò</option>
            {[...new Set(accounts.map(a => a.RoleName))].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-orange-400 cursor-pointer"
            value={gender}
            onChange={e => {
              setGender(e.target.value);
              setPage(1);
            }}
          >
            <option value="">⚥ Tất cả giới tính</option>
            <option value="m">Nam</option>
            <option value="f">Nữ</option>
          </select>

          <div className="flex items-center text-sm text-gray-500">
            Tổng:
            <span className="ml-1 font-semibold text-orange-500">
              {filteredAccounts.length}
            </span>
            tài khoản
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-4 py-3 text-center">Tài khoản</th>

                <th className="px-4 py-3 text-center">Họ tên</th>
                <th className="px-4 py-3 text-center">SĐT</th>
                <th className="px-4 py-3 text-center">CCCD</th>
                <th className="px-4 py-3 text-center">Ngày sinh</th>
                <th className="px-4 py-3 text-center">Giới tính</th>
                <th className="px-4 py-3 text-center">Vai trò</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-400">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                pagedData.map(acc => (
                  <tr
                    key={acc.AccountId}
                    className="border-b hover:bg-orange-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-3 items-center">

                        {/* COL 1 – AVATAR (SÁT PHẢI) */}
                        <div className="flex justify-end pr-2">
                          <img
                            src={
                              acc.Avt
                                ? `${API_URL}/uploads/AccountAvatar/${acc.Avt}`
                                : `${API_URL}/uploads/AccountAvatar/avtDf.png`
                            }
                            onError={e => {
                              e.target.src = `${API_URL}/uploads/AccountAvatar/avtDf.png`;
                            }}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        </div>

                        {/* COL 2 + 3 – USERNAME (SÁT TRÁI) */}
                        <div className="col-span-2 pl-3">
                          <span className="font-medium text-gray-800">
                            {acc.Username}
                          </span>
                        </div>

                      </div>
                    </td>


                    <td className="px-4 py-3 text-center">
                      {acc.Name}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {acc.Phone}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {acc.IdentityNumber}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {formatDate(acc.DateOfBirth)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {acc.Gender === "m" ? "Nam" : "Nữ"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {acc.RoleName}
                    </td>

                    <td className="px-4 py-3 flex justify-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/accounts/${acc.AccountId}`)}
                        className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white transition cursor-pointer"
                      >
                        Cập nhập
                      </button>

                      <button
                        onClick={() => toggleActive(acc.AccountId, acc.IsActive)}
                        className={`px-3 py-1 text-xs rounded text-white transition cursor-pointer ${acc.IsActive
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-500 hover:bg-red-600"
                          }`}
                      >
                        {acc.IsActive ? "Cấm" : "Bỏ Cấm"}
                      </button>


                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION – CLONE 100% */}
        <div className="flex items-center justify-between mt-6">

          {/* PREV */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`
            flex items-center gap-2 px-4 py-2 rounded-full border
            transition-all duration-200
            ${page === 1
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
          `}
          >
            <span className="text-lg">←</span>
            <span className="text-sm font-medium">Trước</span>
          </button>

          {/* PAGE NUMBER */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`
                w-9 h-9 rounded-full text-sm font-semibold
                transition-all duration-200
                ${page === i + 1
                    ? "bg-orange-300 text-white shadow"
                    : "bg-orange-50 text-orange-500 hover:bg-orange-200 cursor-pointer"}
              `}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* NEXT */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className={`
            flex items-center gap-2 px-4 py-2 rounded-full border
            transition-all duration-200
            ${page === totalPages || totalPages === 0
                ? "bg-orange-100 text-orange-300 border-orange-200 cursor-not-allowed"
                : "bg-white text-orange-500 border-orange-300 hover:bg-orange-300 hover:text-white shadow-sm cursor-pointer"}
          `}
          >
            <span className="text-sm font-medium">Sau</span>
            <span className="text-lg">→</span>
          </button>

        </div>
      </div>
    </AdminLayout>
  );

}
