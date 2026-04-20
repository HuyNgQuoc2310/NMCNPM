const db = require("../config/db");
const generateCode = require("../utils/generateCode");
const handleDbError = require("../utils/handleDbError");
const buildPlaceholders = require("../utils/buildPlaceholders");
const { getOrderDetails, recalculateOrderTotal } = require("../utils/orderUtils");

exports.getPaymentByOrder = async (req, res) => {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Ma order khong hop le." });
  }

  try {
    const order = await getOrderDetails(db, orderId);
    if (!order) {
      return res.status(404).json({ message: "Khong tim thay order." });
    }

    const [payments] = await db.query(
      `
        SELECT payment_id, payment_code, payment_time, total_amount, payment_method, status, notes
        FROM payments
        WHERE order_id = ?
      `,
      [orderId]
    );

    res.json({
      order,
      payment: payments[0] || null
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.createPayment = async (req, res) => {
  const orderId = Number(req.body.order_id);
  const paymentMethod = String(req.body.payment_method || "cash").trim().toLowerCase();
  const notes = String(req.body.notes || "").trim() || null;
  const allowedMethods = ["cash", "card", "transfer", "ewallet"];
  const connection = await db.getConnection();

  if (!Number.isInteger(orderId) || orderId <= 0) {
    connection.release();
    return res.status(400).json({ message: "Ma order khong hop le." });
  }

  if (!allowedMethods.includes(paymentMethod)) {
    connection.release();
    return res.status(400).json({ message: "Phuong thuc thanh toan khong hop le." });
  }

  try {
    const [orderRows] = await connection.query(
      `
        SELECT order_id, session_id, status
        FROM orders
        WHERE order_id = ?
      `,
      [orderId]
    );

    if (!orderRows.length) {
      return res.status(404).json({ message: "Khong tim thay order de thanh toan." });
    }

    const order = orderRows[0];
    if (order.status !== "open") {
      return res.status(400).json({ message: "Order nay khong o trang thai co the thanh toan." });
    }

    const [paymentRows] = await connection.query(
      `
        SELECT payment_id
        FROM payments
        WHERE order_id = ?
      `,
      [orderId]
    );

    if (paymentRows.length) {
      return res.status(409).json({ message: "Order nay da duoc thanh toan." });
    }

    const [itemRows] = await connection.query(
      `
        SELECT COUNT(*) AS total_items
        FROM order_items
        WHERE order_id = ?
      `,
      [orderId]
    );

    if (!Number(itemRows[0]?.total_items || 0)) {
      return res.status(400).json({ message: "Order chua co mon nao, khong the thanh toan." });
    }

    await connection.beginTransaction();
    const totalAmount = await recalculateOrderTotal(connection, orderId);

    const paymentCode = generateCode("TT");
    const [paymentResult] = await connection.query(
      `
        INSERT INTO payments (
          payment_code, order_id, payment_time, total_amount, payment_method, status, notes
        )
        VALUES (?, ?, NOW(), ?, ?, 'completed', ?)
      `,
      [paymentCode, orderId, totalAmount, paymentMethod, notes]
    );

    await connection.query(
      `
        UPDATE orders
        SET status = 'paid'
        WHERE order_id = ?
      `,
      [orderId]
    );

    const [sessionRows] = await connection.query(
      `
        SELECT session_id, reservation_id
        FROM table_sessions
        WHERE session_id = ?
      `,
      [order.session_id]
    );

    const session = sessionRows[0];

    await connection.query(
      `
        UPDATE table_sessions
        SET status = 'closed',
            end_time = NOW()
        WHERE session_id = ?
      `,
      [order.session_id]
    );

    const [sessionTableRows] = await connection.query(
      `
        SELECT table_id
        FROM session_tables
        WHERE session_id = ?
      `,
      [order.session_id]
    );

    const tableIds = sessionTableRows.map((row) => row.table_id);
    if (tableIds.length) {
      await connection.query(
        `
          UPDATE tables
          SET status = 'available'
          WHERE table_id IN (${buildPlaceholders(tableIds.length)})
        `,
        tableIds
      );
    }

    if (session?.reservation_id) {
      await connection.query(
        `
          UPDATE reservations
          SET status = 'completed'
          WHERE reservation_id = ?
        `,
        [session.reservation_id]
      );
    }

    await connection.commit();

    const orderDetails = await getOrderDetails(connection, orderId);

    res.status(201).json({
      message: "Thanh toan thanh cong.",
      paymentId: paymentResult.insertId,
      paymentCode,
      order: orderDetails
    });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error, {
      duplicate: "Thanh toan nay da ton tai.",
      foreignKey: "Order khong hop le."
    });
  } finally {
    connection.release();
  }
};
