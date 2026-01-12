import { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../config";

function ListProduct() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 filter + search
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  // 📄 pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 🔥 Toggle Active
  const toggleActive = async (productId, currentStatus) => {
    try {
      const res = await fetch(
        `${API_URL}/products/${productId}/active`,
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
      setProducts(prev =>
        prev.map(p =>
          p.ProductId === productId
            ? { ...p, IsActive: currentStatus ? 0 : 1 }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật trạng thái");
    }
  };

  // reset page khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  const formatPrice = (price) =>
    Number(price).toLocaleString("vi-VN") + " ₫";

  // 🔍 FILTER + SEARCH
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter(p => {
      const matchSearch = p.ProductName
        ?.toLowerCase()
        .includes(keyword) || p.StallName?.toLowerCase().includes(keyword);

      const matchCategory = category
        ? p.CategoryName === category
        : true;

      const matchStatus =
        status === ""
          ? true
          : Number(p.IsActive) === Number(status);


      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, category, status]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const pagedData = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading) return <p>Đang tải dữ liệu...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Danh sách sản phẩm</h2>

      {/* 🔎 FILTER */}
      <div style={{ marginBottom: 15, display: "flex", gap: 10 }}>
        <input
          placeholder="Search name"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {[...new Set(products.map(p => p.CategoryName))].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">Choice Status</option>
          <option value="1">Active</option>
          <option value="0">Un-active</option>
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
            <th>Tên sản phẩm</th>
            <th>Mô tả</th>
            <th>Danh mục</th>
            <th>Gian hàng</th>
            <th>Giá</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {pagedData.length === 0 ? (
            <tr>
              <td colSpan="8" align="center">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            pagedData.map(p => (
              <tr key={p.ProductId}>
                <td>{p.ProductName}</td>
                <td>{p.Description}</td>
                <td>{p.CategoryName}</td>
                <td>{p.StallName}</td>
                <td>{formatPrice(p.Price)}</td>
                <td>{p.Status ? "✔ Đang bán" : "✖ Ngừng bán"}</td>
                <td><button
                  onClick={() => toggleActive(p.ProductId, p.IsActive)}
                  style={{
                    padding: "5px 10px",
                    cursor: "pointer",
                    backgroundColor: p.IsActive ? "#4caf50" : "#f44336",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4
                  }}
                >
                  {p.IsActive ? "Cấm" : "Huỷ Cấm"}
                </button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* 📄 PAGINATION */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 5,
          alignItems: "center"
        }}
      >
        {/* ◀ PREV */}
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ◀ Prev
        </button>

        {/* PAGE NUMBERS */}
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            style={{
              background: page === i + 1 ? "#1976d2" : "#eee",
              color: page === i + 1 ? "#fff" : "#000"
            }}
          >
            {i + 1}
          </button>
        ))}

        {/* NEXT ▶ */}
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}

export default ListProduct;
