module.exports = {
  jwtSecret: process.env.JWT_SECRET || "restaurant-system-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h"
};
