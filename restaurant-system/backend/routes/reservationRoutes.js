const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const { authorizeRoles } = require("../middlewares/authMiddleware");

router.use(authorizeRoles("admin", "staff"));

router.get("/available-tables", reservationController.getAvailableTables);
router.get("/", reservationController.getAllReservations);
router.get("/:id", reservationController.getReservationById);
router.post("/:id/check-in", reservationController.checkInReservation);
router.post("/", reservationController.createReservation);
router.put("/:id", reservationController.updateReservation);

module.exports = router;
