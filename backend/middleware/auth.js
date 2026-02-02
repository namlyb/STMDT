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

   // 3️⃣ Kiểm tra từ session/token trong body (cho mobile/API)
  if (!token && req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    console.log("No token found in request");
    return res.status(401).json({ 
      message: "Chưa đăng nhập",
      details: "Token không tồn tại trong request"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // lưu thông tin account vào req.user
    console.log("Token verified successfully for user:", decoded);
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    return res.status(401).json({ 
      message: "Token không hợp lệ hoặc đã hết hạn",
      details: err.message 
    });
  }
}

function verifyRole(allowedRoles) {
  return (req, res, next) => {
    const roleId = req.user.RoleId;
    if (!allowedRoles.includes(roleId)) {
      return res.status(403).json({ message: "Không có quyền truy cập", userRole: roleId, requiredRoles: allowedRoles });
    }
    next();
  };
}

module.exports = { verifyToken, verifyRole };
