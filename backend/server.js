const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");


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
const orderRouter = require("./routes/OrderRouter");
const voucherRouter = require("./routes/VoucherRouter");
const VoucherUsageRouter = require("./routes/VoucherUsageRouter");
const shipTypeRouter = require("./routes/ShipTypeRouter");
const platformFeeRouter = require("./routes/PlatFormFeeRouter");
const paymentMethodRouter = require('./routes/PaymentMethodRouter');
const feedbackRouter = require("./routes/FeedbackRouter");
const fileRouter = require("./routes/FileRouter");

const app = express();
const server = http.createServer(app);
// Middlewares
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
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
app.use("/api/orders", orderRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/voucher-usage", VoucherUsageRouter);
app.use("/api/shiptypes", shipTypeRouter);
app.use("/api/platform-fees", platformFeeRouter);
app.use('/api/payment-methods', paymentMethodRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/files", fileRouter);

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

// Feedback images
app.use(
  "/uploads/feedback",
  express.static(path.join(__dirname, "uploads/feedback"))
);
app.use(
  "/uploads/File", // Thêm dòng này
  express.static(path.join(__dirname, "uploads/File"))
);
// Start server AFTER DB connected
const PORT = process.env.PORT || 8080;


const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

app.set("io", io);

server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
