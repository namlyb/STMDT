import { useEffect, useState, useRef } from "react";
import Header from "../../components/Guest/Header";
import Sidebar from "../../components/Seller/Sidebar";
import axios from "../../components/lib/axios";
import { API_URL } from "../../config";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [form, setForm] = useState({
    Name: "",
    Phone: "",
    IdentityNumber: "",
    Gender: "",
    day: "",
    month: "",
    year: "",
  });
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const token = sessionStorage.getItem("token");
  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");

    if (roleId !== "3") {
      alert("Bạn không có quyền truy cập");
      navigate("/");
    }
  }, [navigate]);

  // ================= FETCH PROFILE =================
  useEffect(() => {
    const fetchProfile = async () => {
      const res = await axios.get("/accounts/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAccount(res.data);

      if (res.data.DateOfBirth) {
        const d = new Date(res.data.DateOfBirth);
        setForm((prev) => ({
          ...prev,
          Name: res.data.Name || "",
          Phone: res.data.Phone || "",
          IdentityNumber: res.data.IdentityNumber || "",
          Gender: res.data.Gender || "",
          day: d.getDate(),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        }));
      }
    };

    fetchProfile();
  }, [token]);

  // ================= FORM CHANGE =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= UPDATE PROFILE =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const DateOfBirth =
      form.year && form.month && form.day
        ? `${form.year}-${form.month}-${form.day}`
        : null;

    await axios.put(
      `/accounts/${account.AccountId}/profile`,
      {
        Name: form.Name,
        Phone: form.Phone,
        IdentityNumber: form.IdentityNumber,
        Gender: form.Gender,
        DateOfBirth,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("Cập nhật thông tin thành công");
  };

  // ================= AVATAR =================
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSubmit = async () => {
    if (!avatarFile) return alert("Chưa chọn avatar");

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    // 1. upload avatar
    await axios.put(
      `/accounts/${account.AccountId}/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // 2. fetch lại account mới nhất từ DB
    const res = await axios.get("/accounts/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 3. cập nhật sessionStorage
    sessionStorage.setItem("account", JSON.stringify(res.data));

    // 4. cập nhật state local
    setAccount(res.data);
    setAvatarFile(null);
    setAvatarPreview(null);

    alert("Cập nhật avatar thành công");

    // 5. reload để Header + Sidebar render avatar mới
    window.location.reload();
  };


  // ================= UI =================
  const formFields = [
    { label: "Tên", name: "Name" },
    { label: "Số điện thoại", name: "Phone" },
    { label: "CMND / CCCD", name: "IdentityNumber" },
  ];

  return (
    <>
      <Header />

      <div className="max-w-[1200px] mx-auto mt-6 flex gap-6">
        <Sidebar />

        <div className="flex-1 bg-white border rounded p-6">
          <h2 className="text-xl font-semibold mb-6">Hồ sơ của tôi</h2>

          {/* GRID TỔNG */}
          <div className="grid grid-cols-[2fr_1px_1fr] gap-8">
            {/* ================= FORM ================= */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {formFields.map((item) => (
                <div
                  key={item.name}
                  className="grid grid-cols-3 items-center gap-4"
                >
                  <label className="text-right font-medium">
                    {item.label}
                  </label>

                  <input
                    name={item.name}
                    value={form[item.name]}
                    onChange={handleChange}
                    className="col-span-2 border px-3 py-2 rounded w-full"
                  />
                </div>
              ))}

              {/* GENDER */}
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-right font-medium">Giới tính</label>
                <div className="col-span-2 flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="Gender"
                      value="m"
                      checked={form.Gender === "m"}
                      onChange={handleChange}
                    />
                    Nam
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="Gender"
                      value="f"
                      checked={form.Gender === "f"}
                      onChange={handleChange}
                    />
                    Nữ
                  </label>
                </div>
              </div>

              {/* DATE OF BIRTH */}
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-right font-medium">Ngày sinh</label>
                <div className="col-span-2 flex gap-3">
                  <select
                    name="day"
                    value={form.day}
                    onChange={handleChange}
                    className="border px-2 py-1"
                  >
                    <option value="">Ngày</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1}>{i + 1}</option>
                    ))}
                  </select>

                  <select
                    name="month"
                    value={form.month}
                    onChange={handleChange}
                    className="border px-2 py-1"
                  >
                    <option value="">Tháng</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1}>{i + 1}</option>
                    ))}
                  </select>

                  <select
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    className="border px-2 py-1"
                  >
                    <option value="">Năm</option>
                    {Array.from({ length: 70 }, (_, i) => 2025 - i).map(
                      (y) => (
                        <option key={y}>{y}</option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* SUBMIT */}
              <div className="grid grid-cols-3">
                <div />
                <div className="grid grid-cols-2">
                  <button
                    type="submit"
                    className="col-span-1 bg-orange-500 text-white px-2 py-2 rounded"
                  >
                    Lưu
                  </button>
                  <div className="col-span-2" />
                </div>
              </div>
            </form>

            {/* DIVIDER */}
            <div className="bg-black w-[1px]" />

            {/* ================= AVATAR ================= */}
            <div className="flex flex-col items-center gap-6">
              <img
                src={
                  avatarPreview ||
                  account?.Avatar ||
                  `${API_URL}/uploads/AccountAvatar/avtDf.png`
                }
                className="w-[255px] h-[255px] rounded-full object-cover border cursor-pointer"
                onClick={handleAvatarClick}
                title="Click để đổi avatar"
              />

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleAvatarChange}
              />

              <button
                onClick={handleAvatarSubmit}
                className="bg-orange-500 text-white px-6 py-2 rounded"
              >
                Lưu ảnh
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
