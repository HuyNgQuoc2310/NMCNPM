const bcrypt = require("bcryptjs");
const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const parseBoolean = require("../utils/parseBoolean");

const allowedRoles = ["admin", "staff"];
const VIETNAM_PHONE_REGEX = /^0\d{9}$/;
const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

function normalizeEmployeePayload(body = {}) {
  const normalizedEmail = String(body.email || "").trim().toLowerCase();
  const normalizedPhoneNumber = String(body.phone_number || "").replace(/\D/g, "").slice(0, 10);

  return {
    employeeCode: String(body.employee_code || "").trim(),
    username: String(body.username || "").trim(),
    password: String(body.password || ""),
    fullName: String(body.full_name || "").trim(),
    email: normalizedEmail || null,
    phoneNumber: normalizedPhoneNumber || null,
    position: String(body.position || "").trim(),
    role: String(body.role || "staff").trim().toLowerCase(),
    address: String(body.address || "").trim() || null,
    isActive: parseBoolean(body.is_active, true) ? 1 : 0
  };
}

function validateEmployeePayload(payload, options = {}) {
  const { requirePassword = false } = options;

  if (!payload.username || !payload.fullName || !payload.position || (requirePassword && !payload.password)) {
    return requirePassword
      ? "Username, password, tên và chức vụ nhân viên là bắt buộc."
      : "Username, tên và chức vụ nhân viên là bắt buộc.";
  }

  if (payload.phoneNumber && !VIETNAM_PHONE_REGEX.test(payload.phoneNumber)) {
    return "Số điện thoại nhân viên phải gồm đúng 10 số Việt Nam và bắt đầu bằng 0.";
  }

  if (payload.email && !GMAIL_REGEX.test(payload.email)) {
    return "Email nhân viên phải có dạng ten@gmail.com.";
  }

  if (!allowedRoles.includes(payload.role)) {
    return "Chức vụ nhân viên không hợp lệ.";
  }

  return null;
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
      return res.status(404).json({ message: "Không tìm thấy nhân viên." });
    }

    res.json(buildEmployeeResponse(rows[0]));
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.addEmployee = async (req, res) => {
  const payload = normalizeEmployeePayload(req.body);
  const validationMessage = validateEmployeePayload(payload, { requirePassword: true });

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
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
      message: "Thêm nhân viên thành công.",
      employeeId: result.insertId,
      employeeCode
    });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Mã nhân viên, username, email hoặc số điện thoại đã tồn tại."
    });
  }
};

exports.updateEmployee = async (req, res) => {
  const payload = normalizeEmployeePayload(req.body);
  const employeeId = Number(req.params.id);
  const validationMessage = validateEmployeePayload(payload);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ message: "Mã nhân viên không hợp lệ." });
  }

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  if (req.user?.employeeId === employeeId) {
    if (!payload.isActive) {
      return res.status(400).json({ message: "Bạn không thể tự khóa tài khoản của chính mình." });
    }

    if (payload.role !== "admin") {
      return res.status(400).json({ message: "Bạn không thể tự hạ quyền admin của chính mình." });
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
      return res.status(404).json({ message: "Không tìm thấy nhân viên để cập nhật." });
    }

    res.json({ message: "Cập nhật nhân viên thành công." });
  } catch (error) {
    handleDbError(res, error, {
      duplicate: "Username, email hoặc số điện thoại nhân viên đã tồn tại."
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  const employeeId = Number(req.params.id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ message: "Mã nhân viên không hợp lệ." });
  }

  if (req.user?.employeeId === employeeId) {
    return res.status(400).json({ message: "Bạn không thể xóa tài khoản của chính mình." });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM employees WHERE employee_id = ?",
      [employeeId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên để xóa." });
    }

    res.json({ message: "Xóa nhân viên thành công." });
  } catch (error) {
    handleDbError(res, error, {
      referenced: "Nhân viên đang trong đặt bàn, order hoặc ca làm, không thể xóa."
    });
  }
};
