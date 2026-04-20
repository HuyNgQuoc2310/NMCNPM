const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.use(authorizeRoles("admin", "staff"));

router.get("/order/:orderId", paymentController.getPaymentByOrder);
router.post("/", paymentController.createPayment);

module.exports = router;
