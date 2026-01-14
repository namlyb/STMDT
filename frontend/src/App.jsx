import { Routes, Route } from "react-router-dom";
import ListAccount from "./page/Admin/ListAccount";
import ListProduct from "./page/Admin/ListProduct";
import Home from "./page/Guest/home";
import Search from "./page/Guest/Search";
import Login from "./page/Auth/Login";
import Register from "./page/Auth/Register";
import UpdateAccount from "./page/Admin/UpdateAccount";

function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin */}
        {/*<Route path="/admin/dashboard" element={<AdminDashboard />} />*/}
        <Route path="/admin/accounts" element={<ListAccount />} />
        <Route path="/admin/products" element={<ListProduct />} />
        <Route path="/admin/accounts/:id" element={<UpdateAccount />} />

        {/* Seller */}
        {/*<Route path="/seller/dashboard" element={<SellerDashboard />} />}*/}

        {/* Buyer */}
        {/*<Route path="/buyer/home" element={<BuyerHome />} />*/}

        
        
      </Routes>
  );
} export default App;