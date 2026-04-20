const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", authorizeRoles("admin", "staff"), tableController.getAllTables);
router.get("/:id", authorizeRoles("admin", "staff"), tableController.getTableById);
router.post("/", authorizeRoles("admin"), tableController.addTable);
router.put("/:id", authorizeRoles("admin"), tableController.updateTable);
router.delete("/:id", authorizeRoles("admin"), tableController.deleteTable);

module.exports = router;
