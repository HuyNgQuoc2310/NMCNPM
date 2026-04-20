const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.use(authorizeRoles("admin", "staff"));

router.get("/session/:sessionId", orderController.getOrderBySession);
router.get("/:id", orderController.getOrderById);
router.post("/", orderController.createOrder);
router.post("/:id/items", orderController.addOrderItem);
router.put("/:id/items/:itemId", orderController.updateOrderItem);
router.delete("/:id/items/:itemId", orderController.deleteOrderItem);

module.exports = router;
