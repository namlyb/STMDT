import { Routes, Route } from "react-router-dom";
import ListAccount from "./page/Admin/ListAccount";
import ListProduct from "./page/Admin/ListProduct";


function App() {
  return (
    <Routes>
      <Route path="/admin/accounts" element={<ListAccount />} />
      <Route path="/admin/products" element={<ListProduct />} />
    </Routes>
  );
}export default App;