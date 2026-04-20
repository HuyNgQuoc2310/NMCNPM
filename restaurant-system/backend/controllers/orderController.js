const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const { getOrderDetails, recalculateOrderTotal } = require("../utils/orderUtils");

async function getOpenSession(connection, sessionId) {
  const [rows] = await connection.query(
    `
      SELECT session_id, session_code, status
      FROM table_sessions
      WHERE session_id = ?
    `,
    [sessionId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
}

async function getOrderRecord(connection, orderId) {
  const [rows] = await connection.query(
    `
      SELECT order_id, session_id, status
      FROM orders
      WHERE order_id = ?
    `,
    [orderId]
  );

  return rows[0] || null;
}

exports.getOrderById = async (req, res) => {
  try {
    const order = await getOrderDetails(db, req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Khong tim thay order." });
    }

    res.json(order);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getOrderBySession = async (req, res) => {
  const sessionId = Number(req.params.sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: "Ma phien phuc vu khong hop le." });
  }

  try {
    const [rows] = await db.query(
      `
        SELECT order_id
        FROM orders
        WHERE session_id = ?
          AND status = 'open'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [sessionId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Phien phuc vu chua co order dang mo." });
    }

    const order = await getOrderDetails(db, rows[0].order_id);
    res.json(order);
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.createOrder = async (req, res) => {
  const sessionId = Number(req.body.session_id);
  const employeeId = req.body.employee_id ? Number(req.body.employee_id) : null;
  const notes = String(req.body.notes || "").trim() || null;
  const connection = await db.getConnection();

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Ma phien phuc vu khong hop le." });
  }

  if (employeeId !== null && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    connection.release();
    return res.status(400).json({ message: "Nhan vien khong hop le." });
  }

  try {
    const session = await getOpenSession(connection, sessionId);
    if (!session) {
      return res.status(404).json({ message: "Khong tim thay phien phuc vu." });
    }

    if (session.status !== "open") {
      return res.status(400).json({ message: "Phien phuc vu da dong, khong the tao order." });
    }

    const [existingOrders] = await connection.query(
      `
        SELECT order_id
        FROM orders
        WHERE session_id = ?
          AND status = 'open'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [sessionId]
    );

    if (existingOrders.length) {
      const order = await getOrderDetails(connection, existingOrders[0].order_id);
      return res.status(200).json({
        message: "Phien phuc vu da co order dang mo.",
        order
      });
    }

    const orderCode = generateCode("OD");
    const [result] = await connection.query(
      `
        INSERT INTO orders (
          order_code, session_id, employee_id, order_time, status, total_amount, notes
        )
        VALUES (?, ?, ?, NOW(), 'open', 0, ?)
      `,
      [orderCode, sessionId, employeeId, notes]
    );

    const order = await getOrderDetails(connection, result.insertId);

    res.status(201).json({
      message: "Tao order thanh cong.",
      order
    });
  } catch (error) {
    handleDbError(res, error, {
      foreignKey: "Nhan vien hoac phien phuc vu khong hop le."
    });
  } finally {
    connection.release();
  }
};

exports.addOrderItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const itemId = Number(req.body.item_id);
  const quantity = Number(req.body.quantity);
  const notes = String(req.body.notes || "").trim() || null;
  const connection = await db.getConnection();

  if (!Number.isInteger(orderId) || orderId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Ma order khong hop le." });
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Mon an khong hop le." });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    connection.release();
    return res.status(400).json({ message: "So luong mon phai lon hon 0." });
  }

  try {
    const order = await getOrderRecord(connection, orderId);
    if (!order) {
      return res.status(404).json({ message: "Khong tim thay order." });
    }

    if (order.status !== "open") {
      return res.status(400).json({ message: "Chi co the them mon vao order dang mo." });
    }

    const session = await getOpenSession(connection, order.session_id);
    if (!session || session.status !== "open") {
      return res.status(400).json({ message: "Phien phuc vu da dong, khong the goi mon." });
    }

    const [menuRows] = await connection.query(
      `
        SELECT item_id, item_name, price, is_available
        FROM menu_items
        WHERE item_id = ?
      `,
      [itemId]
    );

    if (!menuRows.length) {
      return res.status(404).json({ message: "Khong tim thay mon an." });
    }

    const menuItem = menuRows[0];
    if (!menuItem.is_available) {
      return res.status(400).json({ message: "Mon an nay tam thoi khong phuc vu." });
    }

    await connection.beginTransaction();

    const [existingItemRows] = await connection.query(
      `
        SELECT order_item_id, quantity
        FROM order_items
        WHERE order_id = ?
          AND item_id = ?
        LIMIT 1
      `,
      [orderId, itemId]
    );

    if (existingItemRows.length) {
      const nextQuantity = existingItemRows[0].quantity + quantity;
      await connection.query(
        `
          UPDATE order_items
          SET quantity = ?,
              unit_price = ?,
              line_total = ?,
              notes = ?
          WHERE order_item_id = ?
        `,
        [
          nextQuantity,
          menuItem.price,
          nextQuantity * Number(menuItem.price),
          notes,
          existingItemRows[0].order_item_id
        ]
      );
    } else {
      await connection.query(
        `
          INSERT INTO order_items (
            order_id, item_id, quantity, unit_price, line_total, status, notes
          )
          VALUES (?, ?, ?, ?, ?, 'confirmed', ?)
        `,
        [
          orderId,
          itemId,
          quantity,
          menuItem.price,
          quantity * Number(menuItem.price),
          notes
        ]
      );
    }

    await recalculateOrderTotal(connection, orderId);
    await connection.commit();

    const orderDetails = await getOrderDetails(connection, orderId);
    res.status(201).json({
      message: "Them mon vao order thanh cong.",
      order: orderDetails
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      foreignKey: "Order hoac mon an khong hop le."
    });
  } finally {
    connection.release();
  }
};

exports.updateOrderItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const orderItemId = Number(req.params.itemId);
  const quantity = Number(req.body.quantity);
  const notes = String(req.body.notes || "").trim() || null;
  const connection = await db.getConnection();

  if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(orderItemId) || orderItemId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Thong tin order item khong hop le." });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    connection.release();
    return res.status(400).json({ message: "So luong mon phai lon hon 0." });
  }

  try {
    const order = await getOrderRecord(connection, orderId);
    if (!order) {
      return res.status(404).json({ message: "Khong tim thay order." });
    }

    if (order.status !== "open") {
      return res.status(400).json({ message: "Chi co the sua mon trong order dang mo." });
    }

    const [orderItemRows] = await connection.query(
      `
        SELECT oi.order_item_id, oi.item_id, mi.price
        FROM order_items oi
        INNER JOIN menu_items mi ON mi.item_id = oi.item_id
        WHERE oi.order_item_id = ?
          AND oi.order_id = ?
      `,
      [orderItemId, orderId]
    );

    if (!orderItemRows.length) {
      return res.status(404).json({ message: "Khong tim thay mon trong order." });
    }

    const orderItem = orderItemRows[0];

    await connection.beginTransaction();
    await connection.query(
      `
        UPDATE order_items
        SET quantity = ?, unit_price = ?, line_total = ?, notes = ?
        WHERE order_item_id = ?
      `,
      [
        quantity,
        orderItem.price,
        quantity * Number(orderItem.price),
        notes,
        orderItemId
      ]
    );

    await recalculateOrderTotal(connection, orderId);
    await connection.commit();

    const orderDetails = await getOrderDetails(connection, orderId);
    res.json({
      message: "Cap nhat mon trong order thanh cong.",
      order: orderDetails
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error);
  } finally {
    connection.release();
  }
};

exports.deleteOrderItem = async (req, res) => {
  const orderId = Number(req.params.id);
  const orderItemId = Number(req.params.itemId);
  const connection = await db.getConnection();

  if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(orderItemId) || orderItemId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Thong tin order item khong hop le." });
  }

  try {
    const order = await getOrderRecord(connection, orderId);
    if (!order) {
      return res.status(404).json({ message: "Khong tim thay order." });
    }

    if (order.status !== "open") {
      return res.status(400).json({ message: "Chi co the xoa mon trong order dang mo." });
    }

    const [result] = await connection.query(
      `
        DELETE FROM order_items
        WHERE order_id = ?
          AND order_item_id = ?
      `,
      [orderId, orderItemId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Khong tim thay mon trong order de xoa." });
    }

    await recalculateOrderTotal(connection, orderId);
    const orderDetails = await getOrderDetails(connection, orderId);

    res.json({
      message: "Xoa mon khoi order thanh cong.",
      order: orderDetails
    });
  } catch (error) {
    handleDbError(res, error);
  } finally {
    connection.release();
  }
};
