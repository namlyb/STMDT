const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ message: "API test OK 🚀" });
});

router.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

module.exports = router;
