const express = require("express");
const router = express.Router();
const Role = require("../models/Role");

router.get("/", async (req, res) => {
  try {
    const roles = await Role.getAll();
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy roles" });
  }
});

module.exports = router;
