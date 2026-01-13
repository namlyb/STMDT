import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";

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
  const pageSize = 20;

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
    fetch(`${API_URL}/accounts`)
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
      const res = await fetch(`${API_URL}/accounts/${accountId}/active`, {
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Danh sách tài khoản</h2>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search username, name, phone..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {[...new Set(accounts.map(a => a.RoleName))].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={gender}
          onChange={e => { setGender(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Gender</option>
          <option value="m">Male</option>
          <option value="f">Female</option>
        </select>

        <select
          value={active}
          onChange={e => { setActive(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Active</option>
          <option value="1">ON</option>
          <option value="0">OFF</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Avatar</th>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Identity</th>
              <th className="px-4 py-2 text-left">DOB</th>
              <th className="px-4 py-2 text-left">Gender</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-4">Không có dữ liệu</td>
              </tr>
            ) : (
              pagedData.map(acc => (
                <tr key={acc.AccountId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {acc.Avt ? (
                      <img
                        src={acc.Avt}
                        alt="Avatar"
                        className="w-12 h-12 object-cover rounded-full"
                      />
                    ) : "No Avatar"}
                  </td>
                  <td className="px-4 py-2">{acc.Username}</td>
                  <td className="px-4 py-2">{acc.Name}</td>
                  <td className="px-4 py-2">{acc.Phone}</td>
                  <td className="px-4 py-2">{acc.IdentityNumber}</td>
                  <td className="px-4 py-2">{formatDate(acc.DateOfBirth)}</td>
                  <td className="px-4 py-2">{acc.Gender === "m" ? "Male" : "Female"}</td>
                  <td className="px-4 py-2">{acc.RoleName}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => toggleActive(acc.AccountId, acc.IsActive)}
                      className={`px-3 py-1 rounded text-white ${
                        acc.IsActive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {acc.IsActive ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/accounts/${acc.AccountId}`)}
                      className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded ${page === 1 ? "bg-gray-200 cursor-not-allowed" : "bg-gray-300 hover:bg-gray-400"}`}
          >
            ◀ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded border ${
                page === i + 1 ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded ${page === totalPages ? "bg-gray-200 cursor-not-allowed" : "bg-gray-300 hover:bg-gray-400"}`}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
}
