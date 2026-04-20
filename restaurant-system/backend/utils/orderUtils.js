async function recalculateOrderTotal(connection, orderId) {
  const [rows] = await connection.query(
    `
      SELECT COALESCE(SUM(line_total), 0) AS total_amount
      FROM order_items
      WHERE order_id = ?
    `,
    [orderId]
  );

  const totalAmount = Number(rows[0]?.total_amount || 0);

  await connection.query(
    `
      UPDATE orders
      SET total_amount = ?
      WHERE order_id = ?
    `,
    [totalAmount, orderId]
  );

  return totalAmount;
}

async function getOrderDetails(connection, orderId) {
  const [orders] = await connection.query(
    `
      SELECT
        o.order_id,
        o.order_code,
        o.session_id,
        o.employee_id,
        o.order_time,
        o.status,
        o.total_amount,
        o.notes,
        ts.session_code,
        ts.guest_count,
        ts.start_time,
        ts.status AS session_status,
        e.full_name AS employee_name,
        GROUP_CONCAT(DISTINCT t.table_name ORDER BY t.table_name SEPARATOR ', ') AS table_names
      FROM orders o
      INNER JOIN table_sessions ts ON ts.session_id = o.session_id
      LEFT JOIN employees e ON e.employee_id = o.employee_id
      LEFT JOIN session_tables st ON st.session_id = ts.session_id
      LEFT JOIN tables t ON t.table_id = st.table_id
      WHERE o.order_id = ?
      GROUP BY
        o.order_id,
        o.order_code,
        o.session_id,
        o.employee_id,
        o.order_time,
        o.status,
        o.total_amount,
        o.notes,
        ts.session_code,
        ts.guest_count,
        ts.start_time,
        ts.status,
        e.full_name
    `,
    [orderId]
  );

  if (!orders.length) {
    return null;
  }

  const [items] = await connection.query(
    `
      SELECT
        oi.order_item_id,
        oi.item_id,
        mi.item_code,
        mi.item_name,
        mi.category,
        oi.quantity,
        oi.unit_price,
        oi.line_total,
        oi.status,
        oi.notes
      FROM order_items oi
      INNER JOIN menu_items mi ON mi.item_id = oi.item_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `,
    [orderId]
  );

  return {
    ...orders[0],
    items
  };
}

module.exports = {
  getOrderDetails,
  recalculateOrderTotal
};
