const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const parseBoolean = require("../utils/parseBoolean");

function normalizeCustomerPayload(body = {}) {
  return {
    customerCode: String(body.customer_code || "").trim(),
    fullName: String(body.full_name || "").trim(),
    phoneNumber: String(body.phone_number || "").trim(),
    email: String(body.email || "").trim() || null,
    address: String(body.address || "").trim() || null,
    isActive: parseBoolean(body.is_active, true) ? 1 : 0
  };
}

exports.getAllCustomers = async (req, res) => {
  try {
    const { keyword = "", active } = req.query;
    const conditions = [];
    const params = [];

    if (keyword.trim()) {
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push("(customer_code LIKE ? OR full_name LIKE ? OR phone_number LIKE ?)");
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    if (active !== undefined) {
      conditions.push("is_active = ?");
      params.push(parseBoolean(active, true) ? 1 : 0);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
        SELECT customer_id, customer_code, full_name, phone_number, email, address,
               is_active, created_at, updated_at
        FROM customers
        ${whereClause}
        ORDER BY updated_at DESC, full_name ASC
      `,
      params
    );

    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT customer_id, customer_code, full_name, phone_number, email, address,
               is_active, created_at, updated_at
        FROM customers
        WHERE customer_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay khach hang." });
    }

    res.json(rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.addCustomer = async (req, res) => {
  const payload = normalizeCustomerPayload(req.body);

  if (!payload.fullName || !payload.phoneNumber) {
    return res.status(400).json({ message: "Ten va so dien thoai khach hang la bat buoc." });
  }

  try {
    const customerCode = payload.customerCode || generateCode("KH");
    const [result] = await db.query(
      `
        INSERT INTO customers (
          customer_code, full_name, phone_number, email, address, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        customerCode,
        payload.fullName,
        payload.phoneNumber,
        payload.email,
        payload.address,
        payload.isActive
      ]
    );

    res.status(201).json({
      message: "Them khach hang thanh cong.",
      customerId: result.insertId,
      customerCode
    });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Ma khach hang hoac so dien thoai da ton tai."
    });
  }
};

exports.updateCustomer = async (req, res) => {
  const payload = normalizeCustomerPayload(req.body);

  if (!payload.fullName || !payload.phoneNumber) {
    return res.status(400).json({ message: "Ten va so dien thoai khach hang la bat buoc." });
  }

  try {
    const [result] = await db.query(
      `
        UPDATE customers
        SET full_name = ?, phone_number = ?, email = ?, address = ?, is_active = ?
        WHERE customer_id = ?
      `,
      [
        payload.fullName,
        payload.phoneNumber,
        payload.email,
        payload.address,
        payload.isActive,
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay khach hang de cap nhat." });
    }

    res.json({ message: "Cap nhat khach hang thanh cong." });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "So dien thoai khach hang da ton tai."
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM customers WHERE customer_id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay khach hang de xoa." });
    }

    res.json({ message: "Xoa khach hang thanh cong." });
  } catch (error) {
    handleDbError(res, error, {
      referenced: "Khach hang dang co dat ban, khong the xoa."
    });
  }
};
