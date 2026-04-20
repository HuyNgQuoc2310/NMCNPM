const bcrypt = require("bcryptjs");
const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const parseBoolean = require("../utils/parseBoolean");

const allowedRoles = ["admin", "staff"];

function normalizeEmployeePayload(body = {}) {
  return {
    employeeCode: String(body.employee_code || "").trim(),
    username: String(body.username || "").trim(),
    password: String(body.password || ""),
    fullName: String(body.full_name || "").trim(),
    email: String(body.email || "").trim() || null,
    phoneNumber: String(body.phone_number || "").trim() || null,
    position: String(body.position || "").trim(),
    role: String(body.role || "staff").trim().toLowerCase(),
    address: String(body.address || "").trim() || null,
    isActive: parseBoolean(body.is_active, true) ? 1 : 0
  };
}

function buildEmployeeResponse(employee) {
  return {
    employee_id: employee.employee_id,
    employee_code: employee.employee_code,
    username: employee.username,
    role: employee.role,
    full_name: employee.full_name,
    email: employee.email,
    phone_number: employee.phone_number,
    position: employee.position,
    address: employee.address,
    is_active: employee.is_active,
    created_at: employee.created_at,
    updated_at: employee.updated_at
  };
}

exports.getAllEmployees = async (req, res) => {
  try {
    const { keyword = "", active, role = "" } = req.query;
    const conditions = [];
    const params = [];

    if (keyword.trim()) {
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push(
        "(employee_code LIKE ? OR username LIKE ? OR full_name LIKE ? OR phone_number LIKE ? OR position LIKE ?)"
      );
      params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    if (active !== undefined) {
      conditions.push("is_active = ?");
      params.push(parseBoolean(active, true) ? 1 : 0);
    }

    if (role.trim()) {
      conditions.push("role = ?");
      params.push(role.trim().toLowerCase());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
        SELECT employee_id, employee_code, username, role, full_name, email, phone_number,
               position, address, is_active, created_at, updated_at
        FROM employees
        ${whereClause}
        ORDER BY updated_at DESC, full_name ASC
      `,
      params
    );

    res.json(rows.map(buildEmployeeResponse));
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT employee_id, employee_code, username, role, full_name, email, phone_number,
               position, address, is_active, created_at, updated_at
        FROM employees
        WHERE employee_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay nhan vien." });
    }

    res.json(buildEmployeeResponse(rows[0]));
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.addEmployee = async (req, res) => {
  const payload = normalizeEmployeePayload(req.body);

  if (!payload.username || !payload.password || !payload.fullName || !payload.position) {
    return res.status(400).json({
      message: "Username, password, ten va chuc vu nhan vien la bat buoc."
    });
  }

  if (!allowedRoles.includes(payload.role)) {
    return res.status(400).json({ message: "Role nhan vien khong hop le." });
  }

  try {
    const employeeCode = payload.employeeCode || generateCode("NV");
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const [result] = await db.query(
      `
        INSERT INTO employees (
          employee_code, username, password_hash, role, full_name, email,
          phone_number, position, address, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employeeCode,
        payload.username,
        passwordHash,
        payload.role,
        payload.fullName,
        payload.email,
        payload.phoneNumber,
        payload.position,
        payload.address,
        payload.isActive
      ]
    );

    res.status(201).json({
      message: "Them nhan vien thanh cong.",
      employeeId: result.insertId,
      employeeCode
    });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Ma nhan vien, username, email hoac so dien thoai da ton tai."
    });
  }
};

exports.updateEmployee = async (req, res) => {
  const payload = normalizeEmployeePayload(req.body);
  const employeeId = Number(req.params.id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ message: "Ma nhan vien khong hop le." });
  }

  if (!payload.username || !payload.fullName || !payload.position) {
    return res.status(400).json({
      message: "Username, ten va chuc vu nhan vien la bat buoc."
    });
  }

  if (!allowedRoles.includes(payload.role)) {
    return res.status(400).json({ message: "Role nhan vien khong hop le." });
  }

  if (req.user?.employeeId === employeeId) {
    if (!payload.isActive) {
      return res.status(400).json({ message: "Ban khong the tu khoa tai khoan cua chinh minh." });
    }

    if (payload.role !== "admin") {
      return res.status(400).json({ message: "Ban khong the tu ha quyen admin cua chinh minh." });
    }
  }

  try {
    const updateFields = [
      "username = ?",
      "role = ?",
      "full_name = ?",
      "email = ?",
      "phone_number = ?",
      "position = ?",
      "address = ?",
      "is_active = ?"
    ];
    const params = [
      payload.username,
      payload.role,
      payload.fullName,
      payload.email,
      payload.phoneNumber,
      payload.position,
      payload.address,
      payload.isActive
    ];

    if (payload.password) {
      const passwordHash = await bcrypt.hash(payload.password, 10);
      updateFields.push("password_hash = ?");
      params.push(passwordHash);
    }

    params.push(employeeId);

    const [result] = await db.query(
      `
        UPDATE employees
        SET ${updateFields.join(", ")}
        WHERE employee_id = ?
      `,
      params
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay nhan vien de cap nhat." });
    }

    res.json({ message: "Cap nhat nhan vien thanh cong." });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Username, email hoac so dien thoai nhan vien da ton tai."
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  const employeeId = Number(req.params.id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ message: "Ma nhan vien khong hop le." });
  }

  if (req.user?.employeeId === employeeId) {
    return res.status(400).json({ message: "Ban khong the xoa tai khoan cua chinh minh." });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM employees WHERE employee_id = ?",
      [employeeId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay nhan vien de xoa." });
    }

    res.json({ message: "Xoa nhan vien thanh cong." });
  } catch (error) {
    handleDbError(res, error, {
      referenced: "Nhan vien dang duoc tham chieu trong dat ban, order hoac ca lam, khong the xoa."
    });
  }
};
