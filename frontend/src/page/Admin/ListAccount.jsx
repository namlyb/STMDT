import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../config";

function ListAccount() {
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

    // 🔥 Toggle Active
    const toggleActive = async (accountId, currentStatus) => {
        try {
            const res = await fetch(
                `${API_URL}/accounts/${accountId}/active`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        isActive: currentStatus ? 0 : 1
                    })
                }
            );

            if (!res.ok) throw new Error("Update failed");

            // update UI
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

    // 🔍 FILTER + SEARCH
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
            const matchActive =
                active !== "" ? String(acc.IsActive) === active : true;

            return matchSearch && matchRole && matchGender && matchActive;
        });
    }, [accounts, search, role, gender, active]);

    // 📄 PAGINATION
    const totalPages = Math.ceil(filteredAccounts.length / pageSize);
    const pagedData = filteredAccounts.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    if (loading) {
        return <p>Đang tải dữ liệu...</p>;
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Danh sách tài khoản</h2>

            {/* 🔎 FILTER */}
            <div style={{ marginBottom: 15, display: "flex", gap: 10 }}>
                <input
                    placeholder="Search username, name, phone..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />

                <select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="">All Roles</option>
                    {[...new Set(accounts.map(a => a.RoleName))].map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>

                <select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">All Gender</option>
                    <option value="m">Male</option>
                    <option value="f">Female</option>
                </select>

                <select value={active} onChange={e => setActive(e.target.value)}>
                    <option value="">All Active</option>
                    <option value="1">ON</option>
                    <option value="0">OFF</option>
                </select>
            </div>

            <table
                border="1"
                cellPadding="8"
                cellSpacing="0"
                style={{ width: "100%", borderCollapse: "collapse" }}
            >
                <thead>
                    <tr>
                        <th>Avata</th>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Identity number</th>
                        <th>Date of birth</th>
                        <th>Gender</th>
                        <th>Role</th>
                        <th>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.length === 0 ? (
                        <tr>
                            <td colSpan="10" align="center">
                                Không có dữ liệu
                            </td>
                        </tr>
                    ) : (
                        pagedData.map(acc => (
                            <tr key={acc.AccountId}>
                                <td>{acc.Avt ? <img src={acc.Avt} alt="Avatar" style={{ width: 50, height: 50, objectFit: "cover" }} /> : "No Avatar"}</td>
                                <td>{acc.Username}</td>
                                <td>{acc.Name}</td>
                                <td>{acc.Phone}</td>
                                <td>{acc.IdentityNumber}</td>
                                <td>{formatDate(acc.DateOfBirth)}</td>
                                <td>{acc.Gender == 'm' ? "Male" : "Female"}</td>
                                <td>{acc.RoleName}</td>
                                <td><button
                                    onClick={() => toggleActive(acc.AccountId, acc.IsActive)}
                                    style={{
                                        padding: "5px 10px",
                                        cursor: "pointer",
                                        backgroundColor: acc.IsActive ? "#4caf50" : "#f44336",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4
                                    }}
                                >
                                    {acc.IsActive ? "ON" : "OFF"}
                                </button></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* 📄 PAGINATION */}
            <div style={{ marginTop: 20, display: "flex", gap: 5, alignItems: "center" }}>
                {/* ◀ PREV */}
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                        padding: "5px 10px",
                        cursor: page === 1 ? "not-allowed" : "pointer",
                        opacity: page === 1 ? 0.5 : 1
                    }}
                >
                    ◀ Prev
                </button>

                {/* PAGE NUMBERS */}
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        style={{
                            padding: "5px 10px",
                            background: page === i + 1 ? "#1976d2" : "#eee",
                            color: page === i + 1 ? "#fff" : "#000",
                            border: "1px solid #ccc",
                            cursor: "pointer"
                        }}
                    >
                        {i + 1}
                    </button>
                ))}

                {/* NEXT ▶ */}
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    style={{
                        padding: "5px 10px",
                        cursor:
                            page === totalPages || totalPages === 0
                                ? "not-allowed"
                                : "pointer",
                        opacity: page === totalPages || totalPages === 0 ? 0.5 : 1
                    }}
                >
                    Next ▶
                </button>
            </div>


        </div>
    );
}

export default ListAccount;
