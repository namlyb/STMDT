import { Routes, Route } from "react-router-dom";

import AdminGuard from "./components/Admin/AdminGuard";

import ListAccount from "./page/Admin/ListAccount";
import ListProduct from "./page/Admin/ListProduct";
import ListProductOfSeller from "./page/Seller/ListProduct";
import Home from "./page/Guest/Home";
import Search from "./page/Guest/Search";
import Login from "./page/Auth/Login";
import Register from "./page/Auth/Register";
import UpdateAccount from "./page/Admin/UpdateAccount";
import Cart from "./page/Buyer/Cart";
import ProductDetail from "./page/Buyer/ProductDetail";
import SellerProductDetail from "./page/Seller/ProductDetail";
import Profile from "./page/Buyer/Profile";
import SellerProfile from "./page/Seller/Profile";
import Address from "./page/Buyer/Address";
import AddAddress from "./page/Buyer/AddNewAddress";
import SellerChat from "./page/Seller/Chat";
import ListAds from "./page/Admin/ListAds";
import Order from "./page/Buyer/Order";
import SellerListVoucher from "./page/Seller/LIstVoucher";
import CreateVoucher from "./page/Seller/CreateVoucher";
import UpdateVoucher from "./page/Seller/UpdateVoucher";
function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin */}
        <Route element={<AdminGuard />}>
        {/*<Route path="/admin/dashboard" element={<AdminDashboard />} />*/}
          <Route path="/admin/accounts" element={<ListAccount />} />
          <Route path="/admin/products" element={<ListProduct />} />
          <Route path="/admin/ads" element={<ListAds />} />
          <Route path="/admin/accounts/:id" element={<UpdateAccount />} />
        </Route>
        {/* Seller */}
        {/*<Route path="/seller/dashboard" element={<SellerDashboard />} />}*/}
        <Route path="/seller/products" element={<ListProductOfSeller />} />
        <Route path="/seller/profile" element={<SellerProfile />} />
        <Route path="/seller/products/:id" element={<SellerProductDetail />} />
        <Route path="/seller/chat" element={<SellerChat />} />
        <Route path="/seller/voucher" element={<SellerListVoucher />} />
        <Route path="/seller/voucher/create" element={<CreateVoucher />} />
        <Route path="/seller/voucher/update/:id" element={<UpdateVoucher />} />

        {/* Buyer */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/address" element={<Address />} />
        <Route path="/address/add" element={<AddAddress />} />
        <Route path="/buyer/checkout" element={<Order />} />
        
        
      </Routes>
  );
} export default App;
