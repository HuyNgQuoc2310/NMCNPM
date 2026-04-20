const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const parseBoolean = require("../utils/parseBoolean");

function normalizeMenuPayload(body = {}) {
  return {
    itemCode: String(body.item_code || "").trim(),
    category: String(body.category || "").trim(),
    itemName: String(body.item_name || "").trim(),
    description: String(body.description || "").trim() || null,
    imageUrl: String(body.image_url || "").trim() || null,
    price: Number(body.price),
    isAvailable: parseBoolean(body.is_available, true) ? 1 : 0
  };
}

exports.getAllMenu = async (req, res) => {
  try {
    const { keyword = "", category = "", available } = req.query;
    const conditions = [];
    const params = [];

    if (keyword.trim()) {
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push("(item_code LIKE ? OR item_name LIKE ? OR category LIKE ?)");
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    if (category.trim()) {
      conditions.push("category = ?");
      params.push(category.trim());
    }

    if (available !== undefined) {
      conditions.push("is_available = ?");
      params.push(parseBoolean(available, true) ? 1 : 0);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
        SELECT item_id, item_code, category, item_name, description, price, image_url,
               is_available, created_at, updated_at
        FROM menu_items
        ${whereClause}
        ORDER BY updated_at DESC, item_name ASC
      `,
      params
    );

    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getMenuById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT item_id, item_code, category, item_name, description, price, image_url,
               is_available, created_at, updated_at
        FROM menu_items
        WHERE item_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay mon an." });
    }

    res.json(rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.addMenu = async (req, res) => {
  const payload = normalizeMenuPayload(req.body);

  if (!payload.category || !payload.itemName) {
    return res.status(400).json({ message: "Loai mon va ten mon la bat buoc." });
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return res.status(400).json({ message: "Gia mon an phai lon hon 0." });
  }

  try {
    const itemCode = payload.itemCode || generateCode("MA");
    const [result] = await db.query(
      `
        INSERT INTO menu_items (
          item_code, category, item_name, description, price, image_url, is_available
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        itemCode,
        payload.category,
        payload.itemName,
        payload.description,
        payload.price,
        payload.imageUrl,
        payload.isAvailable
      ]
    );

    res.status(201).json({
      message: "Them mon an thanh cong.",
      itemId: result.insertId,
      itemCode
    });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Ma mon an da ton tai."
    });
  }
};

exports.updateMenu = async (req, res) => {
  const payload = normalizeMenuPayload(req.body);

  if (!payload.category || !payload.itemName) {
    return res.status(400).json({ message: "Loai mon va ten mon la bat buoc." });
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return res.status(400).json({ message: "Gia mon an phai lon hon 0." });
  }

  try {
    const [result] = await db.query(
      `
        UPDATE menu_items
        SET category = ?, item_name = ?, description = ?, price = ?, image_url = ?, is_available = ?
        WHERE item_id = ?
      `,
      [
        payload.category,
        payload.itemName,
        payload.description,
        payload.price,
        payload.imageUrl,
        payload.isAvailable,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay mon an de cap nhat." });
    }

    res.json({ message: "Cap nhat mon an thanh cong." });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM menu_items WHERE item_id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay mon an de xoa." });
    }

    res.json({ message: "Xoa mon an thanh cong." });
  } catch (error) {
    handleDbError(res, error, {
      referenced: "Mon an dang duoc su dung trong don hang, khong the xoa."
    });
  }
};
