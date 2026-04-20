const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/auth");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Ban chua dang nhap." });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Token khong hop le." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token het han hoac khong hop le." });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Ban chua dang nhap." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Ban khong co quyen truy cap chuc nang nay." });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
