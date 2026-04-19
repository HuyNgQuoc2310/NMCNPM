const db = require("../config/db");

exports.getAllTables = (req, res) => {
    db.query("SELECT * FROM tables", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

exports.addTable = (req, res) => {
    const { table_name, capacity, description } = req.body;

    const sql = `
        INSERT INTO tables(table_name, capacity, description)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [table_name, capacity, description], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Thêm bàn thành công" });
    });
};

exports.updateTable = (req, res) => {
    const { id } = req.params;
    const { table_name, capacity, description } = req.body;

    const sql = `
        UPDATE tables
        SET table_name=?, capacity=?, description=?
        WHERE table_id=?
    `;

    db.query(sql, [table_name, capacity, description, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Cập nhật bàn thành công" });
    });
};

exports.deleteTable = (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM tables WHERE table_id=?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Xóa bàn thành công" });
    });
};