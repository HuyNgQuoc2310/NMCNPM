const express = require("express");
const router = express.Router();
const tableController = require("../controllers/tableController");

router.get("/", tableController.getAllTables);
router.post("/", tableController.addTable);
router.put("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);

module.exports = router;