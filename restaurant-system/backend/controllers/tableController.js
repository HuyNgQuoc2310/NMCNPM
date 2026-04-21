const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const parseBoolean = require("../utils/parseBoolean");

const allowedStatuses = ["available", "reserved", "occupied", "unavailable"];

function normalizeTablePayload(body = {}) {
  return {
    tableCode: String(body.table_code || "").trim(),
    tableName: String(body.table_name || "").trim(),
    description: String(body.description || "").trim() || null,
    capacity: Number(body.capacity),
    status: String(body.status || "available").trim().toLowerCase(),
    isActive: parseBoolean(body.is_active, true) ? 1 : 0
  };
}

exports.getAllTables = async (req, res) => {
  try {
    const { keyword = "", status = "" } = req.query;
    const conditions = [];
    const params = [];

    if (keyword.trim()) {
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push("(table_code LIKE ? OR table_name LIKE ? OR description LIKE ?)");
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    if (status.trim()) {
      conditions.push("status = ?");
      params.push(status.trim().toLowerCase());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
        SELECT table_id, table_code, table_name, capacity, description, status,
               is_active, created_at, updated_at
        FROM tables
        ${whereClause}
        ORDER BY table_name ASC
      `,
      params
    );

    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getTableById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT table_id, table_code, table_name, capacity, description, status,
               is_active, created_at, updated_at
        FROM tables
        WHERE table_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy bàn." });
    }

    res.json(rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.addTable = async (req, res) => {
  const payload = normalizeTablePayload(req.body);

  if (!payload.tableName) {
    return res.status(400).json({ message: "Tên bàn là bắt buộc." });
  }

  if (!Number.isInteger(payload.capacity) || payload.capacity <= 0) {
    return res.status(400).json({ message: "Sức chứa bàn phải lớn hơn 0." });
  }

  if (!allowedStatuses.includes(payload.status)) {
    return res.status(400).json({ message: "Trạng thái bàn không hợp lệ." });
  }

  try {
    const tableCode = payload.tableCode || generateCode("B");
    const [result] = await db.query(
      `
        INSERT INTO tables (
          table_code, table_name, capacity, description, status, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        tableCode,
        payload.tableName,
        payload.capacity,
        payload.description,
        payload.status,
        payload.isActive
      ]
    );

    res.status(201).json({
      message: "Thêm bàn thành công.",
      tableId: result.insertId,
      tableCode
    });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Mã bàn đã tồn tại."
    });
  }
};

exports.updateTable = async (req, res) => {
  const payload = normalizeTablePayload(req.body);

  if (!payload.tableName) {
    return res.status(400).json({ message: "Tên bàn là bắt buộc." });
  }

  if (!Number.isInteger(payload.capacity) || payload.capacity <= 0) {
    return res.status(400).json({ message: "Sức chứa bàn phải lớn hơn 0." });
  }

  if (!allowedStatuses.includes(payload.status)) {
    return res.status(400).json({ message: "Trạng thái bàn không hợp lệ." });
  }

  try {
    const [result] = await db.query(
      `
        UPDATE tables
        SET table_name = ?, capacity = ?, description = ?, status = ?, is_active = ?
        WHERE table_id = ?
      `,
      [
        payload.tableName,
        payload.capacity,
        payload.description,
        payload.status,
        payload.isActive,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Không tìm thấy bàn để cập nhật." });
    }

    res.json({ message: "Cập nhật bàn thành công." });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM tables WHERE table_id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Không tìm thấy bàn để xóa." });
    }

    res.json({ message: "Xóa bàn thành công." });
  } catch (error) {
    handleDbError(res, error, {
      referenced: "Bàn đang được sử dụng trong đặt bàn hoặc phiên phục vụ, không thể xóa."
    });
  }
};
