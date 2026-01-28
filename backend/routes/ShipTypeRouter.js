const express = require("express");
const router = express.Router();
const ShipTypeController = require("../controllers/ShipTypeController");
const { verifyToken, verifyRole } = require("../middleware/auth");

// Public routes
router.get("/", ShipTypeController.getAll);

// Admin only routes
router.post("/", verifyToken, verifyRole([1]), ShipTypeController.create);

module.exports = router;