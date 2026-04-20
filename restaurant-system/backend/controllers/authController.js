const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const handleDbError = require("../utils/handleDbError");
const { jwtSecret, jwtExpiresIn } = require("../config/auth");

function buildAuthUser(employee) {
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
    is_active: employee.is_active
  };
}

exports.login = async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ message: "Username va password la bat buoc." });
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          employee_id,
          employee_code,
          username,
          password_hash,
          role,
          full_name,
          email,
          phone_number,
          position,
          address,
          is_active
        FROM employees
        WHERE username = ?
        LIMIT 1
      `,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Sai username hoac password." });
    }

    const employee = rows[0];
    if (!employee.is_active) {
      return res.status(403).json({ message: "Tai khoan da bi khoa." });
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Sai username hoac password." });
    }

    const token = jwt.sign(
      {
        employeeId: employee.employee_id,
        employeeCode: employee.employee_code,
        username: employee.username,
        role: employee.role,
        fullName: employee.full_name
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return res.json({
      message: "Dang nhap thanh cong.",
      token,
      token_type: "Bearer",
      user: buildAuthUser(employee)
    });
  } catch (error) {
    return handleDbError(res, error);
  }
};

exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          employee_id,
          employee_code,
          username,
          role,
          full_name,
          email,
          phone_number,
          position,
          address,
          is_active
        FROM employees
        WHERE employee_id = ?
        LIMIT 1
      `,
      [req.user.employeeId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay tai khoan dang nhap." });
    }

    return res.json(buildAuthUser(rows[0]));
  } catch (error) {
    return handleDbError(res, error);
  }
};
