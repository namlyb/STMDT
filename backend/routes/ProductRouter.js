const express = require("express");
const ProductController = require("../controllers/ProductController");
const uploadProductImage = require("../middleware/uploadProductImage");
const { verifyToken, verifyRole } = require("../middleware/auth");
const router = express.Router();

// ADMIN
router.get("/", ProductController.getAllProducts);
router.put("/:id/active", ProductController.updateProductActive);
router.get("/related/:id", ProductController.getRelatedProducts);
// GUEST
router.get("/random", ProductController.getRandomProducts);
router.get("/search", ProductController.searchProducts);

router.get("/category/:id", ProductController.getProductsByCategory);
router.get("/:id", ProductController.getProductDetail);
//SELLER
router.put("/:id", verifyToken, verifyRole([3]), uploadProductImage.single("Image"), ProductController.updateProduct);
router.get("/seller/:accountId", ProductController.getProductsBySeller);
router.put("/:id/status", ProductController.updateProductStatus);
router.post("/", verifyToken, verifyRole([3]), uploadProductImage.single("Image"), ProductController.createProduct);

module.exports = router;