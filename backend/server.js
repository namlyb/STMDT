const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/db");
const accountRoute = require("./routes/AccountRouter");
const productRoute = require("./routes/ProductRouter");
const roleRouter = require("./routes/RoleRouter");
const categoryRouter = require("./routes/CategoryRouter");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/accounts", accountRoute);
app.use("/api/products", productRoute);
app.use("/api/categories", categoryRouter);
app.use("/api/roles", roleRouter);

// Start server AFTER DB connected
const PORT = process.env.PORT || 8080;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
})();
