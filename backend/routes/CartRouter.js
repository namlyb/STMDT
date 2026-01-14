const express = require("express");
const router = express.Router();
const CartController = require("../controllers/CartController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, CartController.getMyCart);

module.exports = router;
