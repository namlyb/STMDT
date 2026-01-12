const express = require("express");
const { getProducts, updateActive } = require("../controllers/ProductController");

const router = express.Router();

router.get("/", getProducts);
router.put("/:id/active", updateActive);

module.exports = router;