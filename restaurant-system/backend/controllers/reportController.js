const db = require("../config/db");
const handleDbError = require("../utils/handleDbError");

function formatDateValue(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(1);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate)
  };
}

function isValidDateInput(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function parseDateRange(req, res) {
  const defaults = getDefaultDateRange();
  const startDate = String(req.query.start_date || defaults.startDate).trim();
  const endDate = String(req.query.end_date || defaults.endDate).trim();

  if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
    res.status(400).json({ message: "Khoang thoi gian thong ke khong hop le." });
    return null;
  }

  if (startDate > endDate) {
    res.status(400).json({ message: "Ngay bat dau khong duoc lon hon ngay ket thuc." });
    return null;
  }

  return {
    startDate,
    endDate
  };
}

exports.getBestSellingItems = async (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) {
    return;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          mi.item_id,
          mi.item_code,
          mi.category,
          mi.item_name,
          COALESCE(sales_summary.total_quantity, 0) AS total_quantity,
          COALESCE(guest_summary.total_guest_count, 0) AS total_guest_count,
          COALESCE(sales_summary.order_count, 0) AS order_count,
          COALESCE(sales_summary.total_revenue, 0) AS total_revenue
        FROM menu_items mi
        LEFT JOIN (
          SELECT
            oi.item_id,
            SUM(oi.quantity) AS total_quantity,
            COUNT(DISTINCT oi.order_id) AS order_count,
            SUM(oi.line_total) AS total_revenue
          FROM order_items oi
          INNER JOIN orders o
            ON o.order_id = oi.order_id
           AND o.status = 'paid'
          INNER JOIN payments p
            ON p.order_id = o.order_id
           AND p.status = 'completed'
          WHERE DATE(p.payment_time) BETWEEN ? AND ?
          GROUP BY oi.item_id
        ) AS sales_summary
          ON sales_summary.item_id = mi.item_id
        LEFT JOIN (
          SELECT
            item_session_summary.item_id,
            SUM(item_session_summary.guest_count) AS total_guest_count
          FROM (
            SELECT DISTINCT
              oi.item_id,
              ts.session_id,
              ts.guest_count
            FROM order_items oi
            INNER JOIN orders o
              ON o.order_id = oi.order_id
             AND o.status = 'paid'
            INNER JOIN payments p
              ON p.order_id = o.order_id
             AND p.status = 'completed'
            INNER JOIN table_sessions ts
              ON ts.session_id = o.session_id
            WHERE DATE(p.payment_time) BETWEEN ? AND ?
          ) AS item_session_summary
          GROUP BY item_session_summary.item_id
        ) AS guest_summary
          ON guest_summary.item_id = mi.item_id
        WHERE COALESCE(sales_summary.total_quantity, 0) > 0
        ORDER BY total_revenue DESC, total_quantity DESC, mi.item_name ASC
      `,
      [range.startDate, range.endDate, range.startDate, range.endDate]
    );

    res.json({
      range,
      items: rows
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getHourlyGuestStats = async (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) {
    return;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          session_summary.hour_of_day,
          CONCAT(
            LPAD(session_summary.hour_of_day, 2, '0'),
            ':00 - ',
            LPAD(session_summary.hour_of_day + 1, 2, '0'),
            ':00'
          ) AS time_slot,
          COUNT(*) AS total_sessions,
          ROUND(AVG(session_summary.guest_count), 2) AS avg_guests,
          ROUND(
            SUM(session_summary.session_revenue) / NULLIF(SUM(session_summary.guest_count), 0),
            2
          ) AS revenue_per_guest,
          SUM(session_summary.session_revenue) AS total_revenue
        FROM (
          SELECT
            ts.session_id,
            HOUR(ts.start_time) AS hour_of_day,
            ts.guest_count,
            COALESCE(SUM(p.total_amount), 0) AS session_revenue
          FROM table_sessions ts
          LEFT JOIN orders o
            ON o.session_id = ts.session_id
           AND o.status = 'paid'
          LEFT JOIN payments p
            ON p.order_id = o.order_id
           AND p.status = 'completed'
          WHERE ts.status = 'closed'
            AND DATE(ts.start_time) BETWEEN ? AND ?
          GROUP BY ts.session_id, HOUR(ts.start_time), ts.guest_count
        ) AS session_summary
        WHERE session_summary.session_revenue > 0
        GROUP BY session_summary.hour_of_day
        ORDER BY total_revenue DESC, session_summary.hour_of_day ASC
      `,
      [range.startDate, range.endDate]
    );

    res.json({
      range,
      slots: rows
    });
  } catch (error) {
    handleDbError(res, error);
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) {
    return;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          YEAR(payment_time) AS revenue_year,
          MONTH(payment_time) AS revenue_month,
          DATE_FORMAT(payment_time, '%Y-%m') AS month_label,
          COUNT(*) AS total_payments,
          ROUND(AVG(total_amount), 2) AS avg_payment_value,
          SUM(total_amount) AS total_revenue
        FROM payments
        WHERE status = 'completed'
          AND DATE(payment_time) BETWEEN ? AND ?
        GROUP BY YEAR(payment_time), MONTH(payment_time), DATE_FORMAT(payment_time, '%Y-%m')
        ORDER BY revenue_year DESC, revenue_month DESC
      `,
      [range.startDate, range.endDate]
    );

    res.json({
      range,
      months: rows
    });
  } catch (error) {
    handleDbError(res, error);
  }
};
