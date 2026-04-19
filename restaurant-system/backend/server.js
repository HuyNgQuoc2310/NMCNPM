const express = require("express");
const cors = require("cors");

const app = express();

const menuRoutes = require("./routes/menuRoutes");
const tableRoutes = require("./routes/tableRoutes");

app.use(cors());
app.use(express.json());

app.use("/api/menu", menuRoutes);
app.use("/api/tables", tableRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});