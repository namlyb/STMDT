const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");

router.get("/buyer", ChatController.getBuyerChats);
router.post("/", ChatController.getOrCreateChat);
router.get("/seller", ChatController.getSellerChats);

module.exports = router;
