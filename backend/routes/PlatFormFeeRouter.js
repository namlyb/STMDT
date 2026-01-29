const express = require("express");
const router = express.Router();
const PlatformFeeController = require("../controllers/PlatformFeeController");
const { verifyToken, verifyRole } = require("../middleware/auth");

// Chỉ admin mới được truy cập
const allowedRoles = [1]; // Giả sử roleId 1 là admin

// Lấy tất cả mức thuế (active)
router.get("/", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.getAll
);

// Lấy tất cả bao gồm inactive
router.get("/all", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.getAllWithInactive
);

// Lấy mức thuế theo ID
router.get("/:id", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.getById
);

// Lấy mức thuế áp dụng cho giá trị đơn hàng
router.get("/applicable/:orderValue", 
  verifyToken, 
  PlatformFeeController.getApplicable
);

// Tạo mức thuế mới
router.post("/", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.create
);

// Cập nhật mức thuế
router.put("/:id", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.update
);

// Xóa mềm mức thuế
router.delete("/:id", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.softDelete
);

// Kích hoạt lại mức thuế
router.put("/activate/:id", 
  verifyToken, 
  verifyRole(allowedRoles), 
  PlatformFeeController.activate
);

module.exports = router;