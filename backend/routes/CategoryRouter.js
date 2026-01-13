// backend/routes/CategoryRouter.js
const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController");

// GET /api/categories
router.get("/", CategoryController.getAllCategories);

module.exports = router;
