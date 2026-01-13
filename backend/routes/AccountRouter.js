const express = require("express");
const router = express.Router();
const AccountController = require("../controllers/AccountController");


router.get("/", AccountController.getUsers);
router.put("/:id/active", AccountController.updateActive);
router.put("/:id", AccountController.updateAccount);
router.get("/:id", AccountController.getAccountById); 
router.post("/login", AccountController.login);

module.exports = router;
