const express = require("express");
const router = express.Router();
const StallController = require("../controllers/StallController");
const { verifyToken, verifyRole } = require("../middleware/auth");

// GET stall theo AccountId
router.get("/account/:accountId", verifyToken, StallController.getStallByAccount);
router.get("/my-stall", verifyToken, verifyRole([3]), StallController.getMyStall);
router.get("/:id", StallController.getStallDetail);
router.get("/:id/feedbacks", StallController.getStallFeedbacks);


module.exports = router;
