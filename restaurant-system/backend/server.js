const express = require("express");
const cors = require("cors");

const app = express();

const { authenticateToken } = require("./middlewares/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const tableRoutes = require("./routes/tableRoutes");
const customerRoutes = require("./routes/customerRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Restaurant System API is running." });
});

app.use("/api/auth", authRoutes);

app.use("/api/menu", authenticateToken, menuRoutes);
app.use("/api/tables", authenticateToken, tableRoutes);
app.use("/api/customers", authenticateToken, customerRoutes);
app.use("/api/employees", authenticateToken, employeeRoutes);
app.use("/api/reservations", authenticateToken, reservationRoutes);
app.use("/api/sessions", authenticateToken, sessionRoutes);
app.use("/api/orders", authenticateToken, orderRoutes);
app.use("/api/payments", authenticateToken, paymentRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
