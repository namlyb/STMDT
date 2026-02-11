const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/MessageController");

router.get("/", MessageController.getMessages);
router.post("/", MessageController.sendMessage);
router.post("/read", MessageController.markRead);
router.post("/file", MessageController.sendFileMessage);

module.exports = router;
