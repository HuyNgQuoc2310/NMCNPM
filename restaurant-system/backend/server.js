const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend đang chạy");
});

app.listen(5000, () => {
    console.log("Server chạy tại cổng 5000");
});