const express = require("express");
const { getUsers, updateActive } = require("../controllers/AccountController");

const router = express.Router();

router.get("/", getUsers);
router.put("/:id/active", updateActive);

module.exports = router;
