const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const buildPlaceholders = require("../utils/buildPlaceholders");

async function getTablesByIds(connection, tableIds) {
  const [rows] = await connection.query(
    `
      SELECT table_id, table_code, table_name, capacity, description, status, is_active
      FROM tables
      WHERE table_id IN (${buildPlaceholders(tableIds.length)})
      ORDER BY table_name ASC
    `,
    tableIds
  );

  return rows;
}

async function getBusyTableIds(connection, tableIds) {
  const [rows] = await connection.query(
    `
      SELECT DISTINCT st.table_id
      FROM session_tables st
      INNER JOIN table_sessions ts ON ts.session_id = st.session_id
      WHERE ts.status = 'open'
        AND st.table_id IN (${buildPlaceholders(tableIds.length)})
    `,
    tableIds
  );

  return rows.map((row) => row.table_id);
}

async function createSession(connection, { reservationId = null, employeeId = null, guestCount, tableIds, notes = null }) {
  const sessionCode = generateCode("PV");
  const [result] = await connection.query(
    `
      INSERT INTO table_sessions (
        session_code, reservation_id, employee_id, guest_count, start_time, status, notes
      )
      VALUES (?, ?, ?, ?, NOW(), 'open', ?)
    `,
    [sessionCode, reservationId, employeeId, guestCount, notes]
  );

  const sessionId = result.insertId;
  const sessionTableValues = tableIds.map((tableId, index) => [sessionId, tableId, index === 0 ? 1 : 0]);

  await connection.query(
    `
      INSERT INTO session_tables (session_id, table_id, is_primary)
      VALUES ?
    `,
    [sessionTableValues]
  );

  await connection.query(
    `
      UPDATE tables
      SET status = 'occupied'
      WHERE table_id IN (${buildPlaceholders(tableIds.length)})
    `,
    tableIds
  );

  return {
    sessionId,
    sessionCode
  };
}

exports.getOpenSessions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          ts.session_id,
          ts.session_code,
          ts.reservation_id,
          ts.employee_id,
          ts.guest_count,
          ts.start_time,
          ts.status,
          ts.notes,
          r.reservation_code,
          c.customer_id,
          c.customer_code,
          c.full_name AS customer_name,
          c.phone_number,
          e.full_name AS employee_name,
          GROUP_CONCAT(DISTINCT t.table_name ORDER BY t.table_name SEPARATOR ', ') AS table_names,
          COUNT(DISTINCT t.table_id) AS total_tables,
          COALESCE(MAX(CASE WHEN o.status = 'open' THEN o.order_id END), NULL) AS open_order_id,
          COALESCE(MAX(CASE WHEN o.status = 'open' THEN o.total_amount END), 0) AS open_order_total
        FROM table_sessions ts
        LEFT JOIN reservations r ON r.reservation_id = ts.reservation_id
        LEFT JOIN customers c ON c.customer_id = r.customer_id
        LEFT JOIN employees e ON e.employee_id = ts.employee_id
        LEFT JOIN session_tables st ON st.session_id = ts.session_id
        LEFT JOIN tables t ON t.table_id = st.table_id
        LEFT JOIN orders o ON o.session_id = ts.session_id
        WHERE ts.status = 'open'
        GROUP BY
          ts.session_id,
          ts.session_code,
          ts.reservation_id,
          ts.employee_id,
          ts.guest_count,
          ts.start_time,
          ts.status,
          ts.notes,
          r.reservation_code,
          c.customer_id,
          c.customer_code,
          c.full_name,
          c.phone_number,
          e.full_name
        ORDER BY ts.start_time ASC
      `
    );

    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          ts.session_id,
          ts.session_code,
          ts.reservation_id,
          ts.employee_id,
          ts.guest_count,
          ts.start_time,
          ts.end_time,
          ts.status,
          ts.notes,
          r.reservation_code,
          c.customer_id,
          c.customer_code,
          c.full_name AS customer_name,
          c.phone_number,
          c.email,
          c.address,
          e.full_name AS employee_name
        FROM table_sessions ts
        LEFT JOIN reservations r ON r.reservation_id = ts.reservation_id
        LEFT JOIN customers c ON c.customer_id = r.customer_id
        LEFT JOIN employees e ON e.employee_id = ts.employee_id
        WHERE ts.session_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay phien phuc vu." });
    }

    const [tables] = await db.query(
      `
        SELECT
          t.table_id,
          t.table_code,
          t.table_name,
          t.capacity,
          t.description,
          st.is_primary
        FROM session_tables st
        INNER JOIN tables t ON t.table_id = st.table_id
        WHERE st.session_id = ?
        ORDER BY st.is_primary DESC, t.table_name ASC
      `,
      [req.params.id]
    );

    const [orders] = await db.query(
      `
        SELECT order_id, order_code, order_time, status, total_amount
        FROM orders
        WHERE session_id = ?
        ORDER BY created_at DESC
      `,
      [req.params.id]
    );

    res.json({
      ...rows[0],
      tables,
      orders
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.createWalkInSession = async (req, res) => {
  const tableIds = Array.isArray(req.body.table_ids)
    ? [...new Set(req.body.table_ids.map(Number).filter(Number.isInteger))]
    : [];
  const employeeId = req.body.employee_id ? Number(req.body.employee_id) : null;
  const guestCount = Number(req.body.guest_count);
  const notes = String(req.body.notes || "").trim() || null;

  if (!tableIds.length) {
    return res.status(400).json({ message: "Can chon it nhat 1 ban de mo phien phuc vu." });
  }

  if (!Number.isInteger(guestCount) || guestCount <= 0) {
    return res.status(400).json({ message: "So luong khach phai lon hon 0." });
  }

  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    return res.status(400).json({ message: "Nhan vien khong hop le." });
  }

  const connection = await db.getConnection();

  try {
    const tables = await getTablesByIds(connection, tableIds);
    if (tables.length !== tableIds.length) {
      return res.status(400).json({ message: "Co ban duoc chon khong ton tai." });
    }

    const invalidTable = tables.find((table) => !table.is_active || table.status === "unavailable");
    if (invalidTable) {
      return res.status(400).json({ message: `Ban ${invalidTable.table_name} hien khong kha dung.` });
    }

    const busyTableIds = await getBusyTableIds(connection, tableIds);
    if (busyTableIds.length) {
      const busyTable = tables.find((table) => busyTableIds.includes(table.table_id));
      return res.status(409).json({ message: `Ban ${busyTable.table_name} dang co khach.` });
    }

    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
    if (totalCapacity < guestCount) {
      return res.status(400).json({ message: "Tong suc chua ban khong du cho so luong khach." });
    }

    await connection.beginTransaction();
    const session = await createSession(connection, {
      employeeId,
      guestCount,
      tableIds,
      notes
    });
    await connection.commit();

    res.status(201).json({
      message: "Mo phien phuc vu thanh cong.",
      sessionId: session.sessionId,
      sessionCode: session.sessionCode
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      foreignKey: "Nhan vien hoac ban duoc chon khong hop le."
    });
  } finally {
    connection.release();
  }
};

module.exports.createSession = createSession;
