const db = require("../config/db");

exports.getAllMenu = (req, res) => {
    db.query("SELECT * FROM menu_items", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

exports.addMenu = (req, res) => {
    const { category, item_name, description, price } = req.body;

    const sql = `
        INSERT INTO menu_items(category, item_name, description, price)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [category, item_name, description, price], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Thêm món thành công" });
    });
};

exports.updateMenu = (req, res) => {
    const { id } = req.params;
    const { category, item_name, description, price } = req.body;

    const sql = `
        UPDATE menu_items
        SET category=?, item_name=?, description=?, price=?
        WHERE item_id=?
    `;

    db.query(sql, [category, item_name, description, price, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Cập nhật món thành công" });
    });
};

exports.deleteMenu = (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM menu_items WHERE item_id=?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Xóa món thành công" });
    });
};