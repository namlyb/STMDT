const express = require("express");
const router = express.Router();
const StallController = require("../controllers/StallController");
const { verifyToken } = require("../middleware/auth");

// GET stall theo AccountId
router.get("/account/:accountId", verifyToken, StallController.getStallByAccount);

module.exports = router;
