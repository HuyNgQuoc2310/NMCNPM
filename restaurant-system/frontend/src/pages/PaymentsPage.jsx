import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { formatCurrency } from "../utils/formatters";

const paymentMethods = [
  {
    value: "cash",
    label: "Tiền mặt",
    description: "Thu tiền tại quầy và đóng order ngay."
  },
  {
    value: "card",
    label: "Thẻ",
    description: "Quẹt thẻ tại POS của nhà hàng."
  },
  {
    value: "transfer",
    label: "Chuyển khoản",
    description: "Xác nhận giao dịch qua ngân hàng."
  },
  {
    value: "ewallet",
    label: "Ví điện tử",
    description: "Nhận thanh toán bằng QR hoặc ví."
  }
];

const pageSizeOptions = [4, 8, 12];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function PaymentsPage() {
  const { logout, token } = useAuth();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "cash",
    notes: ""
  });
  const [queueSortBy, setQueueSortBy] = useState("amount_desc");
  const [queuePageSize, setQueuePageSize] = useState(4);
  const [queuePage, setQueuePage] = useState(1);

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const fetchPaymentWorkspace = useCallback(async (nextSessionId = null) => {
    try {
      setLoading(true);
      const sessionsData = await apiFetch("/sessions/open", { token });
      const payableSessions = sessionsData.filter((session) => session.open_order_id);
      setSessions(payableSessions);

      const targetSessionId =
        nextSessionId && payableSessions.some((session) => session.session_id === nextSessionId)
          ? nextSessionId
          : payableSessions[0]?.session_id || null;

      setSelectedSessionId(targetSessionId);

      if (targetSessionId) {
        const orderData = await apiFetch(`/orders/session/${targetSessionId}`, { token });
        setSelectedOrder(orderData);
      } else {
        setSelectedOrder(null);
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, token]);

  useEffect(() => {
    async function syncPaymentWorkspace() {
      await fetchPaymentWorkspace();
    }

    void syncPaymentWorkspace();
  }, [fetchPaymentWorkspace]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    let cancelled = false;

    async function fetchOrder() {
      try {
        const orderData = await apiFetch(`/orders/session/${selectedSessionId}`, { token });
        if (!cancelled) {
          setSelectedOrder(orderData);
        }
      } catch (error) {
        if (!cancelled && !handleAuthError(error)) {
          setFeedback({ type: "error", message: error.message });
        }
      }
    }

    void fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [handleAuthError, selectedSessionId, token]);

  async function handlePayment(event) {
    event.preventDefault();

    if (!selectedOrder?.order_id) {
      setFeedback({ type: "error", message: "Không có order nào để thanh toán." });
      return;
    }

    try {
      setPaying(true);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch("/payments", {
        method: "POST",
        token,
        body: {
          order_id: selectedOrder.order_id,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes
        }
      });

      setPaymentForm({
        payment_method: "cash",
        notes: ""
      });
      setFeedback({ type: "success", message: `Đã thanh toán thành công. Mã phiếu: ${response.paymentCode}` });
      await fetchPaymentWorkspace();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setPaying(false);
    }
  }

  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) || null;
  const pendingRevenue = sessions.reduce((sum, session) => sum + Number(session.open_order_total || 0), 0);
  const lineItemCount = selectedOrder?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
  const sortedQueueSessions = useMemo(() => {
    const nextSessions = [...sessions];

    nextSessions.sort((sessionA, sessionB) => {
      if (queueSortBy === "table") {
        return compareText(sessionA.table_names, sessionB.table_names);
      }

      if (queueSortBy === "customer") {
        return compareText(sessionA.customer_name || "Khách vãng lai", sessionB.customer_name || "Khách vãng lai");
      }

      if (queueSortBy === "amount_asc") {
        return Number(sessionA.open_order_total || 0) - Number(sessionB.open_order_total || 0) ||
          compareText(sessionA.table_names, sessionB.table_names);
      }

      if (queueSortBy === "latest") {
        return (sessionB.session_id || 0) - (sessionA.session_id || 0);
      }

      return Number(sessionB.open_order_total || 0) - Number(sessionA.open_order_total || 0) ||
        compareText(sessionA.table_names, sessionB.table_names);
    });

    return nextSessions;
  }, [queueSortBy, sessions]);

  const queueTotalPages = Math.max(1, Math.ceil(sortedQueueSessions.length / queuePageSize));
  const safeQueuePage = Math.min(queuePage, queueTotalPages);

  const paginatedQueueSessions = useMemo(() => {
    const startIndex = (safeQueuePage - 1) * queuePageSize;
    return sortedQueueSessions.slice(startIndex, startIndex + queuePageSize);
  }, [queuePageSize, safeQueuePage, sortedQueueSessions]);

  const visibleQueueStart = sortedQueueSessions.length ? (safeQueuePage - 1) * queuePageSize + 1 : 0;
  const visibleQueueEnd = Math.min(safeQueuePage * queuePageSize, sortedQueueSessions.length);

  function handleQueueSortChange(event) {
    setQueueSortBy(event.target.value);
    setQueuePage(1);
  }

  function handleQueuePageSizeChange(event) {
    setQueuePageSize(Number(event.target.value));
    setQueuePage(1);
  }

  function resetQueueView() {
    setQueueSortBy("amount_desc");
    setQueuePageSize(4);
    setQueuePage(1);
  }

  return (
    <section className="workspace-grid">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Payment flow</span>
            <h1 className="page-intro-title flow-page-title">Thanh toán và đóng bàn</h1>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Bàn chờ thanh toán</span>
              <strong>{sessions.length}</strong>
              <small>Chỉ tính các session đang có order open.</small>
            </article>

            <article className="page-mini-card">
              <span>Doanh thu đang chờ</span>
              <strong>{formatCurrency(pendingRevenue)}</strong>
              <small>Tổng tạm tính của hàng đợi thanh toán.</small>
            </article>

            <article className="page-mini-card">
              <span>Hóa đơn đang xem</span>
              <strong>{selectedOrder ? formatCurrency(selectedOrder.total_amount || 0) : formatCurrency(0)}</strong>
              <small>Cập nhật theo bàn đang được chọn.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Chọn bàn</strong>
              <span>Lấy session có order đang mở từ hàng đợi thanh toán và chuyển sang đối chiếu hóa đơn.</span>
            </article>

            <article className="page-side-item">
              <strong>Đối chiếu hóa đơn</strong>
              <span>Kiểm tra tổng món, số lượng và giá trị order trước khi thu tiền tại quầy.</span>
            </article>

            <article className="page-side-item">
              <strong>Xác nhận thanh toán</strong>
              <span>Chọn phương thức thu tiền rồi đóng phiên phục vụ để giải phóng bàn.</span>
            </article>
          </div>
        </aside>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flow-strip">
        <article className={`flow-step${selectedSessionId ? " active" : ""}`}>
          <span>Bước 1</span>
          <strong>Chọn bàn</strong>
          <small>Lấy session có order đang mở từ hàng đợi thanh toán.</small>
        </article>

        <article className={`flow-step${selectedOrder ? " active" : ""}`}>
          <span>Bước 2</span>
          <strong>Đối chiếu hóa đơn</strong>
          <small>Kiểm tra tổng món, số lượng và tạm tính trước khi thu tiền.</small>
        </article>

        <article className={`flow-step${paying ? " active" : ""}`}>
          <span>Bước 3</span>
          <strong>Xác nhận thanh toán</strong>
          <small>Chọn phương thức thu tiền và đóng phiên phục vụ.</small>
        </article>
      </div>

      {loading ? (
        <div className="screen-state">Đang tải danh sách chờ thanh toán...</div>
      ) : (
        <div className="workspace-grid">
          <div className="content-card stack-card">
            <div className="table-toolbar">
              <div className="section-heading">
                <h3>Bàn có order đang mở</h3>
              </div>

              <div className="table-toolbar-meta align-end">
                <strong>
                  {visibleQueueStart}-{visibleQueueEnd} / {sortedQueueSessions.length}
                </strong>
                <span>Trang {safeQueuePage}/{queueTotalPages}</span>
              </div>
            </div>

            <div className="soft-banner">
              <strong>{sessions.length ? `${sessions.length} bàn đang chờ thanh toán` : "Hàng đợi thanh toán đang trống"}</strong>
            </div>

            <div className="table-toolbar filter-toolbar queue-filter-toolbar">
              <div className="table-toolbar-meta">
                <strong>{sortedQueueSessions.length} session chờ thanh toán</strong>
                <span>Sắp xếp theo giá trị hóa đơn, bàn, khách hàng và chia trang cho hàng đợi cao điểm.</span>
              </div>

              <div className="table-controls-inline">
                <label className="inline-field">
                  <span>Sắp xếp</span>
                  <select className="form-select mini-select" value={queueSortBy} onChange={handleQueueSortChange}>
                    <option value="amount_desc">Tiền cao trước</option>
                    <option value="amount_asc">Tiền thấp trước</option>
                    <option value="table">Tên bàn</option>
                    <option value="customer">Khách hàng</option>
                    <option value="latest">Mới nhất</option>
                  </select>
                </label>

                <label className="inline-field">
                  <span>Mỗi trang</span>
                  <select className="form-select mini-select" value={queuePageSize} onChange={handleQueuePageSizeChange}>
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                      {option} thẻ
                      </option>
                    ))}
                  </select>
                </label>

                <button type="button" className="ghost-button" onClick={resetQueueView}>
                  Đặt lại view
                </button>
              </div>
            </div>

            <div className="selection-grid">
              {paginatedQueueSessions.length ? (
                paginatedQueueSessions.map((session) => (
                  <button
                    key={session.session_id}
                    type="button"
                    className={`select-card${selectedSessionId === session.session_id ? " selected" : ""}`}
                    onClick={() => setSelectedSessionId(session.session_id)}
                  >
                    <strong>{session.table_names}</strong>
                    <span>{session.customer_name || "Khách vãng lai"}</span>
                    <small>Order {session.open_order_id} | {formatCurrency(session.open_order_total || 0)}</small>
                  </button>
                ))
              ) : (
                <p className="muted-text">Hiện tại không có bàn nào đang chờ thanh toán.</p>
              )}
            </div>

            <div className="pagination-bar">
              <div className="pagination-actions">
                <button
                  type="button"
                  className="ghost-button button-sm"
                  onClick={() => setQueuePage((currentValue) => Math.max(1, currentValue - 1))}
                  disabled={safeQueuePage === 1}
                >
                  Trang trước
                </button>

                <span className="pagination-chip">
                  {safeQueuePage}/{queueTotalPages}
                </span>

                <button
                  type="button"
                  className="ghost-button button-sm"
                  onClick={() => setQueuePage((currentValue) => Math.min(queueTotalPages, currentValue + 1))}
                  disabled={safeQueuePage === queueTotalPages}
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>

          <div className="content-card stack-card">
            {selectedOrder ? (
              <>
                <div className="section-heading">
                  <h3>Hóa đơn tạm tính</h3>
                </div>

                <div className="table-shell">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Món</th>
                        <th>SL</th>
                        <th>Giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.order_item_id}>
                          <td>{item.item_name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="summary-box total-box">
                  <span>Tổng thanh toán</span>
                  <strong>{formatCurrency(selectedOrder.total_amount || 0)}</strong>
                  <small>{selectedOrder.table_names}</small>
                </div>

                <div className="micro-stats">
                  <div className="micro-stat">
                    <span>Bàn đang xử lý</span>
                    <strong>{selectedSession?.table_names || "--"}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Số món</span>
                    <strong>{lineItemCount}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Khách</span>
                    <strong>{selectedSession?.customer_name || "Vãng lai"}</strong>
                  </div>
                </div>

                <form className="row g-3" onSubmit={handlePayment}>
                  <div className="col-12">
                  <div className="section-heading">
                    <h3>Phương thức thanh toán</h3>
                  </div>

                    <div className="method-grid">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          className={`method-card${paymentForm.payment_method === method.value ? " selected" : ""}`}
                          onClick={() =>
                            setPaymentForm((currentValue) => ({
                              ...currentValue,
                              payment_method: method.value
                            }))
                          }
                        >
                          <strong>{method.label}</strong>
                          <span>{method.value}</span>
                          <small>{method.description}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-12">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ghi chú thanh toán"
                      value={paymentForm.notes}
                      onChange={(event) =>
                        setPaymentForm((currentValue) => ({
                          ...currentValue,
                          notes: event.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="col-12 d-grid">
                    <button type="submit" className="primary-button" disabled={paying}>
                      {paying ? "Đang xử lý..." : "Xác nhận thanh toán"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-card">
                <span className="eyebrow">Payment queue</span>
                <h3 style={{ margin: "14px 0 8px" }}>Chưa có order nào được chọn</h3>
                <p>Chọn một bàn bên trên để xem hóa đơn và tiến hành thanh toán.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PaymentsPage;
