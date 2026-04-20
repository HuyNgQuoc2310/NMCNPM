const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.use(authorizeRoles("admin", "staff"));

router.get("/open", sessionController.getOpenSessions);
router.get("/:id", sessionController.getSessionById);
router.post("/", sessionController.createWalkInSession);

module.exports = router;
