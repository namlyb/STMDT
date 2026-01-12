const express = require("express");
const cors = require("cors");
require("dotenv").config();

const testRoute = require("./routes/test.route");
const authRoute = require("./routes/auth.route");

const { connectDB } = require("./config/db");
const userRoute = require("./routes/user.route");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", testRoute);
app.use("/api/auth", authRoute);

connectDB();
app.use("/api/users", userRoute);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
