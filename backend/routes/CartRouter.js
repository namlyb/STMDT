const express = require("express");
const router = express.Router();
const CartController = require("../controllers/CartController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, CartController.getMyCart);
router.post("/", verifyToken, CartController.addToCart);
router.delete("/:id", verifyToken, CartController.removeCartItem);

module.exports = router;
