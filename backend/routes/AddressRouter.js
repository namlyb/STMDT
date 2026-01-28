const express = require("express");
const router = express.Router();
const AddressController = require("../controllers/AddressController");
const {verifyToken} = require("../middleware/auth");

// admin
router.get("/", AddressController.getAll);
router.post("/", verifyToken, AddressController.create);

// user
router.get("/me", verifyToken, AddressController.getMyAddress);
router.get("/account/:accountId", verifyToken, AddressController.getByAccount);
router.put("/:id", verifyToken, AddressController.update);
router.delete("/:id", verifyToken, AddressController.delete);
router.get("/:id", verifyToken, AddressController.getById);

module.exports = router;
