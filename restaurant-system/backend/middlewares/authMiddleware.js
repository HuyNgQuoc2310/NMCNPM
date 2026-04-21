const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/auth");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Token không hợp lệ." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token hết hạn hoặc không hợp lệ." });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập chức năng này." });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
