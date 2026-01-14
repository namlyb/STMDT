const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  let token = null;

  // 1️⃣ Ưu tiên Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2️⃣ Fallback cookie (nếu có)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // lưu thông tin account vào req.user
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
}

function verifyRole(allowedRoles) {
  return (req, res, next) => {
    const roleId = req.user.RoleId;
    if (!allowedRoles.includes(roleId)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
}

module.exports = { verifyToken, verifyRole };
