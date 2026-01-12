const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  res.json({ message: "Login API OK" });
});
router.get("/", (req, res) => {
  res.send("Auth route OK 1");
});


module.exports = router;
