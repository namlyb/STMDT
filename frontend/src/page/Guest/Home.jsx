import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Guest/Header";
import Footer from "../../components/Guest/footer";
import axios from "../../components/lib/axios";

export default function Home() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        axios.get("/categories")
            .then(res => {
                console.log("Categories:", res.data);
                setCategories(res.data);
            })
            .catch(console.error);

        axios.get("/products/random")
            .then(res => {
                console.log("Random products:", res.data);
                setProducts(res.data);
            })
            .catch(console.error);
    }, []);

    return (
        <>
            <Header />

            <main className="bg-gray-50 py-6">
                <div className="grid grid-cols-12 max-w-7xl mx-auto px-4 gap-4">

                    {/* LEFT SIDEBAR */}
                    <aside className="col-span-2">
                        <div className="bg-white p-2 rounded shadow
                  max-h-[calc(100vh-120px)]
                  overflow-y-auto
                  sticky top-24">
                            <h3 className="font-bold mb-2">Danh mục</h3>

                            <ul className="space-y-2 text-sm">
                                {categories.map(cat => (
                                    <li
                                        key={cat.CategoryId}
                                        className="flex items-center gap-2 cursor-pointer hover:text-orange-500"
                                        onClick={() => navigate(`/search?category=${cat.CategoryId}`)}
                                    >
                                        {cat.CategoryImage && (
                                            <img
                                                src={cat.CategoryImage}
                                                alt=""
                                                className="w-5 h-5 object-cover"
                                            />
                                        )}
                                        {cat.CategoryName}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>


                    {/* MAIN CONTENT */}
                    <section className="col-span-8">
                        <h2 className="text-xl font-bold mb-4">Gợi ý hôm nay</h2>

                        <div className="grid grid-cols-4 gap-4">
                            {products.map(product => (
                                <div
                                    key={product.ProductId}
                                    className="bg-white p-3 rounded shadow hover:shadow-lg transition"
                                >
                                    <img
                                        src={product.Image}
                                        alt=""
                                        className="h-32 w-full object-cover mb-2"
                                    />
                                    <p className="text-sm line-clamp-2">
                                        {product.ProductName}
                                    </p>
                                    <p className="text-red-500 font-bold">
                                        {Number(product.Price).toLocaleString()} ₫
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* RIGHT SIDEBAR */}
                    <aside className="col-span-2 bg-white p-4 rounded shadow">
                        <h3 className="font-bold">Quảng cáo</h3>
                    </aside>

                </div>
            </main>

            <Footer />
        </>
    );
}
