const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const { createSession } = require("./sessionController");

const allowedStatuses = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show"
];

const blockingStatuses = ["pending", "confirmed", "checked_in"];

function normalizeReservationPayload(body = {}) {
  return {
    customerId: Number(body.customer_id),
    employeeId: body.employee_id ? Number(body.employee_id) : null,
    reservationDate: String(body.reservation_date || "").trim(),
    reservationTime: String(body.reservation_time || "").trim(),
    numberOfGuests: Number(body.number_of_guests),
    status: String(body.status || "confirmed").trim().toLowerCase(),
    notes: String(body.notes || "").trim() || null,
    tableIds: Array.isArray(body.table_ids)
      ? [...new Set(body.table_ids.map(Number).filter(Number.isInteger))]
      : []
  };
}

function buildPlaceholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeString(value) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

async function getReservedTableIds(connection, reservationDate, reservationTime, excludeReservationId = null) {
  const params = [reservationDate, reservationTime, ...blockingStatuses];
  let sql = `
    SELECT DISTINCT rt.table_id
    FROM reservation_tables rt
    INNER JOIN reservations r ON r.reservation_id = rt.reservation_id
    WHERE r.reservation_date = ?
      AND r.reservation_time = ?
      AND r.status IN (${buildPlaceholders(blockingStatuses.length)})
  `;

  if (excludeReservationId) {
    sql += " AND r.reservation_id <> ?";
    params.push(excludeReservationId);
  }

  const [rows] = await connection.query(sql, params);
  return rows.map((row) => row.table_id);
}

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

function buildCombinationSuggestions(availableTables, guestCount, combinationRules) {
  const tableMap = new Map(availableTables.map((table) => [table.table_id, table]));
  const seen = new Set();
  const suggestions = [];

  for (const rule of combinationRules) {
    const firstTable = tableMap.get(rule.table_id);
    const secondTable = tableMap.get(rule.compatible_table_id);

    if (!firstTable || !secondTable) {
      continue;
    }

    const signature = [firstTable.table_id, secondTable.table_id].sort((a, b) => a - b).join("-");
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);

    const totalCapacity = firstTable.capacity + secondTable.capacity;
    if (totalCapacity < guestCount) {
      continue;
    }

    suggestions.push({
      table_ids: [firstTable.table_id, secondTable.table_id],
      table_names: [firstTable.table_name, secondTable.table_name],
      total_capacity: totalCapacity,
      description: `${firstTable.table_name} + ${secondTable.table_name}`
    });
  }

  return suggestions.sort((left, right) => {
    if (left.total_capacity !== right.total_capacity) {
      return left.total_capacity - right.total_capacity;
    }

    return left.description.localeCompare(right.description);
  });
}

async function validateReservationPayload(connection, payload, excludeReservationId = null) {
  if (!Number.isInteger(payload.customerId) || payload.customerId <= 0) {
    return "Khách hàng không hợp lệ.";
  }

  if (payload.employeeId !== null && (!Number.isInteger(payload.employeeId) || payload.employeeId <= 0)) {
    return "Nhân viên không hợp lệ.";
  }

  if (!isValidDateString(payload.reservationDate) || !isValidTimeString(payload.reservationTime)) {
    return "Ngày giờ đặt bàn không hợp lệ.";
  }

  if (!Number.isInteger(payload.numberOfGuests) || payload.numberOfGuests <= 0) {
    return "Số lượng khách phải lớn hơn 0.";
  }

  if (!payload.tableIds.length) {
    return "Cần chọn ít nhất 1 bàn.";
  }

  if (!allowedStatuses.includes(payload.status)) {
    return "Trạng thái đặt bàn không hợp lệ.";
  }

  const tables = await getTablesByIds(connection, payload.tableIds);
  if (tables.length !== payload.tableIds.length) {
    return "Các bàn được chọn không tồn tại.";
  }

  const invalidTable = tables.find((table) => !table.is_active || table.status === "unavailable");
  if (invalidTable) {
    return `Bàn ${invalidTable.table_name} hiện không khả dụng.`;
  }

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  if (totalCapacity < payload.numberOfGuests) {
    return "Tổng sức chứa của các bàn được chọn không đủ cho số lượng khách.";
  }

  const reservedTableIds = await getReservedTableIds(
    connection,
    payload.reservationDate,
    payload.reservationTime,
    excludeReservationId
  );

  const conflictedTable = tables.find((table) => reservedTableIds.includes(table.table_id));
  if (conflictedTable) {
    return `Bàn ${conflictedTable.table_name} đã được đặt trong khung giờ này.`;
  }

  return null;
}

exports.getAllReservations = async (req, res) => {
  try {
    const { keyword = "", date = "", status = "" } = req.query;
    const conditions = [];
    const params = [];

    if (keyword.trim()) {
      const likeKeyword = `%${keyword.trim()}%`;
      conditions.push("(r.reservation_code LIKE ? OR c.full_name LIKE ? OR c.phone_number LIKE ?)");
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    if (date.trim()) {
      conditions.push("r.reservation_date = ?");
      params.push(date.trim());
    }

    if (status.trim()) {
      conditions.push("r.status = ?");
      params.push(status.trim().toLowerCase());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
        SELECT
          r.reservation_id,
          r.reservation_code,
          r.reservation_date,
          r.reservation_time,
          r.number_of_guests,
          r.status,
          r.notes,
          c.customer_id,
          c.customer_code,
          c.full_name AS customer_name,
          c.phone_number,
          e.employee_id,
          e.full_name AS employee_name,
          GROUP_CONCAT(t.table_name ORDER BY t.table_name SEPARATOR ', ') AS table_names
        FROM reservations r
        INNER JOIN customers c ON c.customer_id = r.customer_id
        LEFT JOIN employees e ON e.employee_id = r.employee_id
        LEFT JOIN reservation_tables rt ON rt.reservation_id = r.reservation_id
        LEFT JOIN tables t ON t.table_id = rt.table_id
        ${whereClause}
        GROUP BY
          r.reservation_id,
          r.reservation_code,
          r.reservation_date,
          r.reservation_time,
          r.number_of_guests,
          r.status,
          r.notes,
          c.customer_id,
          c.customer_code,
          c.full_name,
          c.phone_number,
          e.employee_id,
          e.full_name
        ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.created_at DESC
      `,
      params
    );

    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getReservationById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          r.reservation_id,
          r.reservation_code,
          r.customer_id,
          r.employee_id,
          r.reservation_date,
          r.reservation_time,
          r.number_of_guests,
          r.status,
          r.notes,
          c.customer_code,
          c.full_name AS customer_name,
          c.phone_number,
          c.email,
          c.address,
          e.full_name AS employee_name
        FROM reservations r
        INNER JOIN customers c ON c.customer_id = r.customer_id
        LEFT JOIN employees e ON e.employee_id = r.employee_id
        WHERE r.reservation_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Khong tim thay phieu dat ban." });
    }

    const [tables] = await db.query(
      `
        SELECT t.table_id, t.table_code, t.table_name, t.capacity, t.description
        FROM reservation_tables rt
        INNER JOIN tables t ON t.table_id = rt.table_id
        WHERE rt.reservation_id = ?
        ORDER BY t.table_name ASC
      `,
      [req.params.id]
    );

    res.json({
      ...rows[0],
      tables
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getAvailableTables = async (req, res) => {
  const reservationDate = String(req.query.date || "").trim();
  const reservationTime = String(req.query.time || "").trim();
  const guests = Number(req.query.guests);

  if (!isValidDateString(reservationDate) || !isValidTimeString(reservationTime)) {
    return res.status(400).json({ message: "Ngày giờ tìm bàn không hợp lệ." });
  }

  if (!Number.isInteger(guests) || guests <= 0) {
    return res.status(400).json({ message: "Số lượng khách phải lớn hơn 0." });
  }

  try {
    const reservedTableIds = await getReservedTableIds(db, reservationDate, reservationTime);
    const params = ["unavailable", ...reservedTableIds];
    const notInClause = reservedTableIds.length
      ? `AND table_id NOT IN (${buildPlaceholders(reservedTableIds.length)})`
      : "";

    const [availableTables] = await db.query(
      `
        SELECT table_id, table_code, table_name, capacity, description, status
        FROM tables
        WHERE is_active = 1
          AND status <> ?
          ${notInClause}
        ORDER BY capacity ASC, table_name ASC
      `,
      params
    );

    const [combinationRules] = await db.query(
      `
        SELECT table_id, compatible_table_id
        FROM table_combinations
      `
    );

    const singleTables = availableTables.filter((table) => table.capacity >= guests);
    const combinations = buildCombinationSuggestions(availableTables, guests, combinationRules);

    res.json({
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      number_of_guests: guests,
      single_tables: singleTables,
      combinations
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.createReservation = async (req, res) => {
  const payload = normalizeReservationPayload(req.body);
  const connection = await db.getConnection();

  try {
    const validationMessage = await validateReservationPayload(connection, payload);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    await connection.beginTransaction();

    const reservationCode = generateCode("DT");
    const [result] = await connection.query(
      `
        INSERT INTO reservations (
          reservation_code, customer_id, employee_id, reservation_date, reservation_time,
          number_of_guests, status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        reservationCode,
        payload.customerId,
        payload.employeeId,
        payload.reservationDate,
        payload.reservationTime,
        payload.numberOfGuests,
        payload.status,
        payload.notes
      ]
    );

    const reservationId = result.insertId;
    const reservationTableValues = payload.tableIds.map((tableId) => [reservationId, tableId]);
    await connection.query(
      `
        INSERT INTO reservation_tables (reservation_id, table_id)
        VALUES ?
      `,
      [reservationTableValues]
    );

    await connection.commit();

    res.status(201).json({
      message: "Tạo phiếu đặt bàn thành công.",
      reservationId,
      reservationCode
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      duplicate: "Mã phiếu đặt bàn đã tồn tại.",
      foreignKey: "Khách hàng, nhân viên hoặc bàn được chọn không hợp lệ."
    });
  } finally {
    connection.release();
  }
};

exports.updateReservation = async (req, res) => {
  const reservationId = Number(req.params.id);
  const payload = normalizeReservationPayload(req.body);
  const connection = await db.getConnection();

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Mã phiếu đặt bàn không hợp lệ." });
  }

  try {
    const [existingRows] = await connection.query(
      "SELECT reservation_id, status FROM reservations WHERE reservation_id = ?",
      [reservationId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Không tìm thấy phiếu đặt bàn để cập nhật." });
    }

    if (["completed", "cancelled", "no_show"].includes(existingRows[0].status)) {
      return res.status(400).json({
        message: "Không thể sửa phiếu đặt bàn đã kết thúc hoặc đã hủy."
      });
    }

    const validationMessage = await validateReservationPayload(connection, payload, reservationId);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE reservations
        SET customer_id = ?, employee_id = ?, reservation_date = ?, reservation_time = ?,
            number_of_guests = ?, status = ?, notes = ?
        WHERE reservation_id = ?
      `,
      [
        payload.customerId,
        payload.employeeId,
        payload.reservationDate,
        payload.reservationTime,
        payload.numberOfGuests,
        payload.status,
        payload.notes,
        reservationId
      ]
    );

    await connection.query(
      "DELETE FROM reservation_tables WHERE reservation_id = ?",
      [reservationId]
    );

    const reservationTableValues = payload.tableIds.map((tableId) => [reservationId, tableId]);
    await connection.query(
      `
        INSERT INTO reservation_tables (reservation_id, table_id)
        VALUES ?
      `,
      [reservationTableValues]
    );

    await connection.commit();

    res.json({ message: "Cập nhật phiếu đặt bàn thành công." });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      foreignKey: "Khách hàng, nhân viên hoặc bàn được chọn không hợp lệ."
    });
  } finally {
    connection.release();
  }
};

exports.checkInReservation = async (req, res) => {
  const reservationId = Number(req.params.id);
  const employeeId = req.body.employee_id ? Number(req.body.employee_id) : null;
  const notes = String(req.body.notes || "").trim() || null;
  const connection = await db.getConnection();

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Mã phiếu đặt bàn không hợp lệ." });
  }

  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    connection.release();
    return res.status(400).json({ message: "Nhân viên không hợp lệ." });
  }

  try {
    const [reservationRows] = await connection.query(
      `
        SELECT reservation_id, reservation_code, number_of_guests, status
        FROM reservations
        WHERE reservation_id = ?
      `,
      [reservationId]
    );

    if (!reservationRows.length) {
      return res.status(404).json({ message: "Không tìm thấy phiếu đặt bàn." });
    }

    const reservation = reservationRows[0];
    if (!["pending", "confirmed"].includes(reservation.status)) {
      return res.status(400).json({
        message: "Chỉ có thể check-in phiếu đặt bàn đang chờ hoặc đã xác nhận."
      });
    }

    const [existingSessionRows] = await connection.query(
      `
        SELECT session_id
        FROM table_sessions
        WHERE reservation_id = ?
          AND status = 'open'
      `,
      [reservationId]
    );

    if (existingSessionRows.length) {
      return res.status(409).json({
        message: "Phiếu đặt bàn này đã có phiên phục vụ đang mở."
      });
    }

    const [reservationTables] = await connection.query(
      `
        SELECT t.table_id, t.table_name, t.capacity, t.status, t.is_active
        FROM reservation_tables rt
        INNER JOIN tables t ON t.table_id = rt.table_id
        WHERE rt.reservation_id = ?
        ORDER BY t.table_name ASC
      `,
      [reservationId]
    );

    if (!reservationTables.length) {
      return res.status(400).json({ message: "Phiếu đặt bàn chưa gắn bàn nào." });
    }

    const invalidTable = reservationTables.find((table) => !table.is_active || table.status === "unavailable");
    if (invalidTable) {
      return res.status(400).json({
        message: `Ban ${invalidTable.table_name} hien khong kha dung de check-in.`
      });
    }

    const busyTableIds = await connection.query(
      `
        SELECT DISTINCT st.table_id
        FROM session_tables st
        INNER JOIN table_sessions ts ON ts.session_id = st.session_id
        WHERE ts.status = 'open'
          AND st.table_id IN (${buildPlaceholders(reservationTables.length)})
      `,
      reservationTables.map((table) => table.table_id)
    );

    const activeTableIds = busyTableIds[0].map((row) => row.table_id);
    if (activeTableIds.length) {
      const busyTable = reservationTables.find((table) => activeTableIds.includes(table.table_id));
      return res.status(409).json({
        message: `Bàn ${busyTable.table_name} đang có khách.`
      });
    }

    await connection.beginTransaction();

    const session = await createSession(connection, {
      reservationId,
      employeeId,
      guestCount: reservation.number_of_guests,
      tableIds: reservationTables.map((table) => table.table_id),
      notes
    });

    await connection.query(
      `
        UPDATE reservations
        SET status = 'checked_in',
            employee_id = COALESCE(?, employee_id)
        WHERE reservation_id = ?
      `,
      [employeeId, reservationId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Check-in thanh cong.",
      sessionId: session.sessionId,
      sessionCode: session.sessionCode
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      foreignKey: "Nhân viên hoặc phiếu đặt bàn không hợp lệ."
    });
  } finally {
    connection.release();
  }
};
