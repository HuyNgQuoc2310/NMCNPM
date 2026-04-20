const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", authorizeRoles("admin", "staff"), customerController.getAllCustomers);
router.get("/:id", authorizeRoles("admin", "staff"), customerController.getCustomerById);
router.post("/", authorizeRoles("admin", "staff"), customerController.addCustomer);
router.put("/:id", authorizeRoles("admin", "staff"), customerController.updateCustomer);
router.delete("/:id", authorizeRoles("admin", "staff"), customerController.deleteCustomer);

module.exports = router;
