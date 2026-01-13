const express = require("express");
const ProductController  = require("../controllers/ProductController");

const router = express.Router();

// ADMIN
router.get("/", ProductController.getAllProducts);
router.patch("/:id/active", ProductController.updateProductActive);

// GUEST
router.get("/random", ProductController.getRandomProducts);
router.get("/search", ProductController.searchProducts);

router.get("/category/:id", ProductController.getProductsByCategory);
router.get("/:id", ProductController.getProductDetail);


module.exports = router;