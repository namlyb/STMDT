const express = require("express");
const router = express.Router();
const AccountController = require("../controllers/AccountController");
const { verifyToken, verifyRole } = require("../middleware/auth");
const Account = require("../models/account");

router.get("/", AccountController.getUsers);
router.put("/:id/active", AccountController.updateActive);
router.put("/:id", AccountController.updateAccount);
router.get("/:id", AccountController.getAccountById); 
router.post("/login", AccountController.login);
router.post("/register", AccountController.register);

// route protected
router.get("/me", verifyToken, async (req, res) => {
  try {
    // Lấy AccountId từ token
    const account = await Account.getById(req.user.AccountId);
    if (!account) return res.status(404).json({ message: "Tài khoản không tồn tại" });

    account.Avatar = account.Avt
    ? `${req.protocol}://${req.get("host")}/uploads/AccountAvatar/${account.Avt}`
    : null;

  res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
