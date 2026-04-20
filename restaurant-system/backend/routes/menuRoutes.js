const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", authorizeRoles("admin", "staff"), menuController.getAllMenu);
router.get("/:id", authorizeRoles("admin", "staff"), menuController.getMenuById);
router.post("/", authorizeRoles("admin"), menuController.addMenu);
router.put("/:id", authorizeRoles("admin"), menuController.updateMenu);
router.delete("/:id", authorizeRoles("admin"), menuController.deleteMenu);

module.exports = router;
