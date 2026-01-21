const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const path = require("path");

const { connectDB } = require("./config/db");
const accountRoute = require("./routes/AccountRouter");
const productRoute = require("./routes/ProductRouter");
const roleRouter = require("./routes/RoleRouter");
const categoryRouter = require("./routes/CategoryRouter");
const cartRouter = require("./routes/CartRouter");
const addressRouter = require("./routes/AddressRouter");
const adsRoute = require("./routes/AdsRouter");
const stallRouter = require("./routes/StallRouter");
const chatRouter = require("./routes/ChatRouter");
const messageRouter = require("./routes/MessageRouter");
const AdsRouter = require("./routes/AdsRouter");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/accounts", accountRoute);
app.use("/api/products", productRoute);
app.use("/api/categories", categoryRouter);
app.use("/api/roles", roleRouter);
app.use("/api/carts", cartRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/ads", adsRoute);
app.use("/api/stalls", stallRouter);
app.use("/api/chats", chatRouter);
app.use("/api/messages", messageRouter);
app.use("/api/styleAds", AdsRouter);

app.use("/api/chats", require("./routes/ChatRouter"));
app.use("/api/messages", require("./routes/MessageRouter"));


// Avatar images
app.use(
  "/uploads/AccountAvatar",
  express.static(path.join(__dirname, "uploads/AccountAvatar"))
);

// Product images
app.use(
  "/uploads/ProductImage",
  express.static(path.join(__dirname, "uploads/ProductImage"))
);

// Category images
app.use(
  "/uploads/CategoryImage",
  express.static(path.join(__dirname, "uploads/CategoryImage"))
);

// Ads images
app.use(
  "/uploads/AdsImage",
  express.static(path.join(__dirname, "uploads/AdsImage"))
);

// Start server AFTER DB connected
const PORT = process.env.PORT || 8080;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
})();
