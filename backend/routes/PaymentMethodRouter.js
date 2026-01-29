const express = require("express");
const router = express.Router();
const PaymentMethodController = require("../controllers/PaymentMethodController");

// Lấy tất cả payment methods (public - ai cũng có thể xem)
router.get("/", PaymentMethodController.getAll);

// Lấy payment method theo ID
router.get("/:id", PaymentMethodController.getById);

module.exports = router;