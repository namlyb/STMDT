import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";
import { API_URL } from "../../config";
import { Camera } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  const [product, setProduct] = useState({
    ProductName: "",
    Price: "",
    Description: "",
    Image: ""
  });

  useEffect(() => {
  const roleId = sessionStorage.getItem("roleId");

  if (roleId !== "3") {
    alert("Bạn không có quyền truy cập");
    navigate("/");
  }
}, [navigate]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(`/products/${id}`);
        const data = res.data.product;
        setProduct(data);
        setPreview(data.Image);
      } catch {
        alert("Không tìm thấy sản phẩm");
        navigate("/seller/products");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append("ProductName", product.ProductName);
      formData.append("Price", product.Price);
      formData.append("Description", product.Description);
      if (file) formData.append("Image", file);

      await axios.put(`/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Cập nhật thành công");
      navigate("/seller/products");
    } catch {
      alert("Lỗi cập nhật sản phẩm");
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto mt-6 flex gap-6">
        <SellerSidebar />

        <div className="flex-1 bg-white p-8 rounded-xl shadow-sm relative">
          <button
            onClick={() => navigate("/seller/products")}
            className="absolute cursor-pointer top-4 left-4 text-sm text-orange-500 hover:underline"
          >
            ← Trở về
          </button>

          <h1 className="text-2xl font-bold mb-8 text-center">
            Cập nhật sản phẩm
          </h1>

          {/* IMAGE PICKER */}
          <div className="flex justify-center mb-8">
            <label
              htmlFor="imageUpload"
              className="group relative w-72 h-72 cursor-pointer"
            >
              <img
                src={preview}
                alt=""
                className="w-full h-full object-contain border rounded-xl bg-gray-50"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Camera className="text-white w-8 h-8 mb-2" />
                <span className="text-white text-sm">Thay đổi hình ảnh</span>
              </div>
            </label>

            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* FORM */}
          <div className="space-y-5 max-w-xl mx-auto">
            <div>
              <label className="font-semibold">Tên sản phẩm</label>
              <input
                name="ProductName"
                value={product.ProductName}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="font-semibold">Giá</label>
              <input
                type="number"
                name="Price"
                value={product.Price}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="font-semibold">Mô tả</label>
              <textarea
                name="Description"
                value={product.Description}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded-lg min-h-[140px] focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleSave}
                className="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white px-8 py-2 rounded-lg font-semibold shadow"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
