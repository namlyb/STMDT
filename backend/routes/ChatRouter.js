const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");

router.get("/", ChatController.getBuyerChats);
router.post("/", ChatController.getOrCreateChat);

module.exports = router;
