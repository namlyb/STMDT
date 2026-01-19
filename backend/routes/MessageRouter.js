const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/MessageController");

router.get("/", MessageController.getMessages);
router.post("/", MessageController.sendMessage);

module.exports = router;
