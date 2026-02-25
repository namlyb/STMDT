// src/page/Seller/AddProduct.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../components/lib/axios";
import Header from "../../components/Guest/Header";
import SellerSidebar from "../../components/Seller/Sidebar";

export default function AddProduct() {
    const navigate = useNavigate();
    const account = JSON.parse(sessionStorage.getItem("account"));

    // State cho form
    const [productName, setProductName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]); // mảng categoryId

    // State cho danh mục
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // State cho stall
    const [stall, setStall] = useState(null);
    const [loadingStall, setLoadingStall] = useState(true);

    // Kiểm tra role
    useEffect(() => {
        const roleId = sessionStorage.getItem("roleId");
        if (roleId !== "3") {
            alert("Bạn không có quyền truy cập");
            navigate("/");
        }
    }, [navigate]);

    // Lấy thông tin stall của seller
    useEffect(() => {
        const fetchStall = async () => {
            try {
                const res = await axios.get("/stalls/my-stall");
                setStall(res.data);
            } catch (err) {
                console.error("Lỗi lấy stall:", err);
                alert("Không thể lấy thông tin gian hàng");
            } finally {
                setLoadingStall(false);
            }
        };
        fetchStall();
    }, []);

    // Lấy danh sách categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get("/categories");
                // res.data là mảng categories, mỗi category có CategoryImage là URL đầy đủ (do backend trả về)
                setCategories(res.data);
            } catch (err) {
                console.error("Lỗi lấy danh mục:", err);
                alert("Không thể tải danh mục sản phẩm");
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    // Xử lý chọn ảnh
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Xử lý chọn category (checkbox)
    const handleCategoryChange = (categoryId) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
    };

    // Xử lý submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Kiểm tra dữ liệu
        if (!productName.trim()) {
            alert("Vui lòng nhập tên sản phẩm");
            return;
        }
        if (!price || isNaN(price) || parseInt(price) <= 0) {
            alert("Vui lòng nhập giá hợp lệ");
            return;
        }
        if (!description.trim()) {
            alert("Vui lòng nhập mô tả");
            return;
        }
        if (!image) {
            alert("Vui lòng chọn ảnh sản phẩm");
            return;
        }
        if (selectedCategories.length === 0) {
            alert("Vui lòng chọn ít nhất một danh mục");
            return;
        }

        // Debug: kiểm tra dữ liệu trước khi gửi
        console.log("Selected categories:", selectedCategories);
        console.log("CategoryIds JSON:", JSON.stringify(selectedCategories));

        const formData = new FormData();
        formData.append("ProductName", productName);
        formData.append("Price", price);
        formData.append("Description", description);
        formData.append("Image", image);
        // Gửi categoryIds dưới dạng JSON string
        formData.append("CategoryIds", JSON.stringify(selectedCategories));

        try {
            const res = await axios.post("/products", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data.success) {
                alert("Thêm sản phẩm thành công!");
                navigate("/seller/products");
            } else {
                alert(res.data.message || "Có lỗi xảy ra");
            }
        } catch (err) {
            console.error("Lỗi khi thêm sản phẩm:", err);
            alert(err.response?.data?.message || "Lỗi server");
        }
    };

    if (loadingStall || loadingCategories) {
        return (
            <>
                <Header />
                <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
                    <SellerSidebar />
                    <div className="flex-1 p-8 text-center">Đang tải dữ liệu...</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="max-w-6xl mx-auto mt-4 flex gap-6 items-start">
                <SellerSidebar />

                <div className="flex-1 bg-white p-6 rounded shadow">
                    <h1 className="text-2xl font-bold mb-6">Thêm sản phẩm mới</h1>

                    <form onSubmit={handleSubmit}>
                        {/* Stall (chỉ hiển thị) */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Gian hàng
                            </label>
                            <input
                                type="text"
                                value={stall?.StallName || ""}
                                disabled
                                className="w-full border border-gray-300 bg-gray-100 rounded px-3 py-2"
                            />
                        </div>

                        {/* ProductName */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Tên sản phẩm <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                required
                            />
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Giá (VNĐ) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">
                                Mô tả <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows="4"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                required
                            ></textarea>
                        </div>

                        {/* Image */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                Ảnh sản phẩm <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {imagePreview ? (
                                        <div className="relative inline-block">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="max-h-48 mx-auto object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { setImage(null); setImagePreview(null); }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none">
                                                    <span>Tải ảnh lên</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                                </label>
                                                <p className="pl-1">hoặc kéo thả</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF lên đến 5MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Categories - Checkbox */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">
                                Danh mục <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {categories.map((cat) => (
                                    <label
                                        key={cat.CategoryId}
                                        className={`flex items-center p-3 border rounded cursor-pointer transition ${selectedCategories.includes(cat.CategoryId)
                                            ? "border-orange-500 bg-orange-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            value={cat.CategoryId}
                                            checked={selectedCategories.includes(cat.CategoryId)}
                                            onChange={() => handleCategoryChange(cat.CategoryId)}
                                            className="mr-2 cursor-pointer"
                                        />
                                        {/* SỬA LỖI: Dùng trực tiếp cat.CategoryImage (đã là URL đầy đủ) */}
                                        {cat.CategoryImage ? (
                                            <img
                                                src={cat.CategoryImage}
                                                alt={cat.CategoryName}
                                                className="w-8 h-8 object-cover rounded mr-2"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-200 rounded mr-2 flex items-center justify-center text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        <span>{cat.CategoryName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="bg-orange-500 text-white cursor-pointer px-6 py-2 rounded hover:bg-orange-600 transition"
                            >
                                Thêm sản phẩm
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/seller/products")}
                                className="bg-gray-300 cursor-pointer text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition"
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}