const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const ShipTypeController = require("../controllers/ShipTypeController");

// ✅ Checkout lấy shiptype
router.get("/", ShipTypeController.getAll);

module.exports = router;
