const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.use(authorizeRoles("admin"));

router.get("/best-selling-items", reportController.getBestSellingItems);
router.get("/hourly-guests", reportController.getHourlyGuestStats);
router.get("/monthly-revenue", reportController.getMonthlyRevenue);

module.exports = router;
