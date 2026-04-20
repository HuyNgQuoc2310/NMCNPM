import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { formatCurrency } from "../utils/formatters";

const paymentMethods = [
  {
    value: "cash",
    label: "Tien mat",
    description: "Thu tien tai quay va dong order ngay."
  },
  {
    value: "card",
    label: "The",
    description: "Quet the tai POS cua nha hang."
  },
  {
    value: "transfer",
    label: "Chuyen khoan",
    description: "Xac nhan giao dich qua ngan hang."
  },
  {
    value: "ewallet",
    label: "Vi dien tu",
    description: "Nhan thanh toan bang QR hoac vi."
  }
];

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

  function handleAuthError(error) {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }

  async function fetchPaymentWorkspace(nextSessionId = null) {
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
  }

  useEffect(() => {
    fetchPaymentWorkspace();
  }, [token]);

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

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, token]);

  async function handlePayment(event) {
    event.preventDefault();

    if (!selectedOrder?.order_id) {
      setFeedback({ type: "error", message: "Khong co order nao de thanh toan." });
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
      setFeedback({ type: "success", message: `Da thanh toan thanh cong. Ma phieu: ${response.paymentCode}` });
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

  return (
    <section className="workspace-grid">
      <div className="ops-hero">
        <div className="ops-copy">
          <span className="eyebrow">Payment flow</span>
          <h1>Thanh toan va dong ban</h1>
          <p>
            Luong nay tap trung vao viec chon order dang mo, doi chieu hoa don va xac nhan thanh toan bang mot giao
            dien ro rang, de trinh chieu va thao tac nhanh tai quay.
          </p>
        </div>

        <div className="ops-kpis">
          <article className="ops-kpi">
            <span>Ban cho thanh toan</span>
            <strong>{sessions.length}</strong>
            <small>Chi tinh cac session dang co order open.</small>
          </article>

          <article className="ops-kpi">
            <span>Doanh thu dang cho</span>
            <strong>{formatCurrency(pendingRevenue)}</strong>
            <small>Tong tam tinh cua hang doi thanh toan.</small>
          </article>

          <article className="ops-kpi">
            <span>Hoa don dang xem</span>
            <strong>{selectedOrder ? formatCurrency(selectedOrder.total_amount || 0) : formatCurrency(0)}</strong>
            <small>Cap nhat theo ban dang duoc chon.</small>
          </article>
        </div>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flow-strip">
        <article className={`flow-step${selectedSessionId ? " active" : ""}`}>
          <span>Buoc 1</span>
          <strong>Chon ban</strong>
          <small>Lay session co order dang mo tu hang doi thanh toan.</small>
        </article>

        <article className={`flow-step${selectedOrder ? " active" : ""}`}>
          <span>Buoc 2</span>
          <strong>Doi chieu hoa don</strong>
          <small>Kiem tra tong mon, so luong va tam tinh truoc khi thu tien.</small>
        </article>

        <article className={`flow-step${paying ? " active" : ""}`}>
          <span>Buoc 3</span>
          <strong>Xac nhan thanh toan</strong>
          <small>Chon phuong thuc thu tien va dong phien phuc vu.</small>
        </article>
      </div>

      {loading ? (
        <div className="screen-state">Dang tai danh sach cho thanh toan...</div>
      ) : (
        <div className="app-grid-2">
          <div className="content-card stack-card">
            <div className="section-heading">
              <h3>Ban co order dang mo</h3>
              <p>Danh sach nay chi hien cac ban co order dang o trang thai open.</p>
            </div>

            <div className="soft-banner">
              <strong>{sessions.length ? `${sessions.length} ban dang cho thanh toan` : "Hang doi thanh toan dang trong"}</strong>
              <span>Co the doi session de doi chieu hoa don o panel ben phai.</span>
            </div>

            <div className="selection-grid">
              {sessions.length ? (
                sessions.map((session) => (
                  <button
                    key={session.session_id}
                    type="button"
                    className={`select-card${selectedSessionId === session.session_id ? " selected" : ""}`}
                    onClick={() => setSelectedSessionId(session.session_id)}
                  >
                    <strong>{session.table_names}</strong>
                    <span>{session.customer_name || "Khach vang lai"}</span>
                    <small>Order {session.open_order_id} | {formatCurrency(session.open_order_total || 0)}</small>
                  </button>
                ))
              ) : (
                <p className="muted-text">Hien tai khong co ban nao dang cho thanh toan.</p>
              )}
            </div>
          </div>

          <div className="content-card stack-card">
            {selectedOrder ? (
              <>
                <div className="section-heading">
                  <h3>Hoa don tam tinh</h3>
                  <p>Kiem tra lai danh sach mon va chon phuong thuc thanh toan.</p>
                </div>

                <div className="table-shell">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Mon</th>
                        <th>SL</th>
                        <th>Gia</th>
                        <th>Thanh tien</th>
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
                  <span>Tong thanh toan</span>
                  <strong>{formatCurrency(selectedOrder.total_amount || 0)}</strong>
                  <small>{selectedOrder.table_names}</small>
                </div>

                <div className="micro-stats">
                  <div className="micro-stat">
                    <span>Ban dang xu ly</span>
                    <strong>{selectedSession?.table_names || "--"}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>So mon</span>
                    <strong>{lineItemCount}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Khach</span>
                    <strong>{selectedSession?.customer_name || "Vang lai"}</strong>
                  </div>
                </div>

                <form className="row g-3" onSubmit={handlePayment}>
                  <div className="col-12">
                    <div className="section-heading">
                      <h3>Phuong thuc thanh toan</h3>
                      <p>Chon cach thu tien phu hop voi giao dich hien tai.</p>
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
                      placeholder="Ghi chu thanh toan"
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
                      {paying ? "Dang xu ly..." : "Xac nhan thanh toan"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-card">
                <span className="eyebrow">Payment queue</span>
                <h3 style={{ margin: "14px 0 8px" }}>Chua co order nao duoc chon</h3>
                <p>Chon mot ban ben trai de xem hoa don va tien hanh thanh toan.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PaymentsPage;
