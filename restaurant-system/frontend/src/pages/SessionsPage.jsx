import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { formatCurrency } from "../utils/formatters";

function SessionsPage() {
  const { logout, token, user } = useAuth();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingSessionDetails, setLoadingSessionDetails] = useState(false);
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [processingItemId, setProcessingItemId] = useState(null);
  const [menuFilter, setMenuFilter] = useState("");

  const [walkInForm, setWalkInForm] = useState({
    guest_count: "2",
    table_ids: [],
    notes: ""
  });

  const [itemForm, setItemForm] = useState({
    item_id: "",
    quantity: "1",
    notes: ""
  });

  function handleAuthError(error) {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }

  async function fetchBaseData() {
    try {
      setLoadingWorkspace(true);
      const [tablesData, sessionsData, menuData] = await Promise.all([
        apiFetch("/tables", { token }),
        apiFetch("/sessions/open", { token }),
        apiFetch("/menu", { token })
      ]);

      setTables(tablesData);
      setSessions(sessionsData);
      setMenu(menuData);

      if (sessionsData.length) {
        setSelectedSessionId((currentValue) =>
          currentValue && sessionsData.some((session) => session.session_id === currentValue)
            ? currentValue
            : sessionsData[0].session_id
        );
      } else {
        setSelectedSessionId(null);
        setSelectedSession(null);
        setSelectedOrder(null);
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoadingWorkspace(false);
    }
  }

  useEffect(() => {
    fetchBaseData();
  }, [token]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    let cancelled = false;

    async function fetchSessionDetails() {
      try {
        setLoadingSessionDetails(true);
        const [sessionDetail, orderDetail] = await Promise.all([
          apiFetch(`/sessions/${selectedSessionId}`, { token }),
          apiFetch(`/orders/session/${selectedSessionId}`, { token }).catch((error) => {
            if (error.status === 404) {
              return null;
            }

            throw error;
          })
        ]);

        if (!cancelled) {
          setSelectedSession(sessionDetail);
          setSelectedOrder(orderDetail);
          setQuantityDrafts(
            orderDetail?.items?.reduce((accumulator, item) => {
              accumulator[item.order_item_id] = item.quantity;
              return accumulator;
            }, {}) || {}
          );
        }
      } catch (error) {
        if (!cancelled && !handleAuthError(error)) {
          setFeedback({ type: "error", message: error.message });
        }
      } finally {
        if (!cancelled) {
          setLoadingSessionDetails(false);
        }
      }
    }

    fetchSessionDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, token]);

  function toggleWalkInTable(tableId) {
    setWalkInForm((currentValue) => {
      const exists = currentValue.table_ids.includes(tableId);

      return {
        ...currentValue,
        table_ids: exists
          ? currentValue.table_ids.filter((id) => id !== tableId)
          : [...currentValue.table_ids, tableId]
      };
    });
  }

  async function handleCreateWalkIn(event) {
    event.preventDefault();

    try {
      setCreatingWalkIn(true);
      setFeedback({ type: "", message: "" });
      await apiFetch("/sessions", {
        method: "POST",
        token,
        body: {
          employee_id: user.employee_id,
          guest_count: Number(walkInForm.guest_count),
          table_ids: walkInForm.table_ids,
          notes: walkInForm.notes
        }
      });

      setWalkInForm({
        guest_count: "2",
        table_ids: [],
        notes: ""
      });
      setFeedback({ type: "success", message: "Da mo phien phuc vu cho khach vang lai." });
      await fetchBaseData();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setCreatingWalkIn(false);
    }
  }

  async function handleCreateOrder() {
    if (!selectedSessionId) {
      return;
    }

    try {
      setCreatingOrder(true);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch("/orders", {
        method: "POST",
        token,
        body: {
          session_id: selectedSessionId,
          employee_id: user.employee_id,
          notes: "Order tao tu frontend"
        }
      });

      setSelectedOrder(response.order || response);
      setFeedback({ type: "success", message: "Da tao order cho ban dang phuc vu." });
      await fetchBaseData();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setCreatingOrder(false);
    }
  }

  async function handleAddOrderItem(event) {
    event.preventDefault();

    if (!selectedOrder?.order_id) {
      setFeedback({ type: "error", message: "Can tao order truoc khi them mon." });
      return;
    }

    try {
      setAddingItem(true);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch(`/orders/${selectedOrder.order_id}/items`, {
        method: "POST",
        token,
        body: {
          item_id: Number(itemForm.item_id),
          quantity: Number(itemForm.quantity),
          notes: itemForm.notes
        }
      });

      setSelectedOrder(response.order);
      setQuantityDrafts(
        response.order.items.reduce((accumulator, item) => {
          accumulator[item.order_item_id] = item.quantity;
          return accumulator;
        }, {})
      );
      setItemForm({
        item_id: "",
        quantity: "1",
        notes: ""
      });
      await fetchBaseData();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setAddingItem(false);
    }
  }

  async function handleUpdateOrderItem(orderItemId) {
    try {
      setProcessingItemId(orderItemId);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch(`/orders/${selectedOrder.order_id}/items/${orderItemId}`, {
        method: "PUT",
        token,
        body: {
          quantity: Number(quantityDrafts[orderItemId]),
          notes: ""
        }
      });

      setSelectedOrder(response.order);
      await fetchBaseData();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleDeleteOrderItem(orderItemId) {
    try {
      setProcessingItemId(orderItemId);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch(`/orders/${selectedOrder.order_id}/items/${orderItemId}`, {
        method: "DELETE",
        token
      });

      setSelectedOrder(response.order);
      await fetchBaseData();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setProcessingItemId(null);
    }
  }

  const availableWalkInTables = tables.filter((table) => table.status !== "occupied" && table.is_active);
  const filteredMenu = menu.filter((item) =>
    item.item_name.toLowerCase().includes(menuFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(menuFilter.toLowerCase())
  );
  const openSessionsCount = sessions.length;
  const sessionsWithOrderCount = sessions.filter((session) => session.open_order_id).length;
  const orderItemCount = selectedOrder?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
  const selectedTableNames =
    selectedSession?.table_names || selectedSession?.tables?.map((table) => table.table_name).join(", ") || "--";

  return (
    <section className="workspace-grid">
      <div className="ops-hero">
        <div className="ops-copy">
          <span className="eyebrow">Service flow</span>
          <h1>Phien phuc vu va goi mon</h1>
          <p>
            Man nay duoc toi uu cho thao tac tai sanh: mo phien cho khach vang lai, chon ban dang phuc vu, tao order va
            cap nhat mon ngay trong mot workspace.
          </p>
        </div>

        <div className="ops-kpis">
          <article className="ops-kpi">
            <span>Phien dang mo</span>
            <strong>{openSessionsCount}</strong>
            <small>So ban dang phuc vu trong he thong.</small>
          </article>

          <article className="ops-kpi">
            <span>Da co order</span>
            <strong>{sessionsWithOrderCount}</strong>
            <small>San sang chuyen sang thanh toan.</small>
          </article>

          <article className="ops-kpi">
            <span>Ban san sang</span>
            <strong>{availableWalkInTables.length}</strong>
            <small>Dung cho khach vang lai vao truc tiep.</small>
          </article>
        </div>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flow-strip">
        <article className={`flow-step${walkInForm.table_ids.length ? " active" : ""}`}>
          <span>Buoc 1</span>
          <strong>Mo phien</strong>
          <small>Chon ban cho khach vang lai hoac nhan phien tu dat ban.</small>
        </article>

        <article className={`flow-step${selectedSessionId ? " active" : ""}`}>
          <span>Buoc 2</span>
          <strong>Chon session</strong>
          <small>Tap trung vao mot ban dang phuc vu de thao tac nhanh.</small>
        </article>

        <article className={`flow-step${selectedOrder ? " active" : ""}`}>
          <span>Buoc 3</span>
          <strong>Cap nhat order</strong>
          <small>Them mon, doi so luong va chuan bi chuyen sang thanh toan.</small>
        </article>
      </div>

      <div className="app-grid-2">
        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>Khach vang lai</h3>
            <p>Neu khach khong dat truoc, nhan vien co the mo phien phuc vu truc tiep.</p>
          </div>

          <div className="soft-banner">
            <strong>{walkInForm.table_ids.length ? `${walkInForm.table_ids.length} ban da duoc chon` : "Chua chon ban"}</strong>
            <span>So khach hien tai: {walkInForm.guest_count}. Co the chon nhieu ban neu doan dong.</span>
          </div>

          <form className="row g-3" onSubmit={handleCreateWalkIn}>
            <div className="col-md-4">
              <input
                type="number"
                min="1"
                className="form-control"
                value={walkInForm.guest_count}
                onChange={(event) =>
                  setWalkInForm((currentValue) => ({ ...currentValue, guest_count: event.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Ghi chu cho phien phuc vu"
                value={walkInForm.notes}
                onChange={(event) => setWalkInForm((currentValue) => ({ ...currentValue, notes: event.target.value }))}
              />
            </div>

            <div className="col-12">
              <div className="selection-grid">
                {availableWalkInTables.map((table) => (
                  <button
                    key={table.table_id}
                    type="button"
                    className={`select-card${walkInForm.table_ids.includes(table.table_id) ? " selected" : ""}`}
                    onClick={() => toggleWalkInTable(table.table_id)}
                  >
                    <strong>{table.table_name}</strong>
                    <span>{table.capacity} khach</span>
                    <small>{table.status}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 d-grid">
              <button type="submit" className="primary-button" disabled={creatingWalkIn}>
                {creatingWalkIn ? "Dang mo..." : "Mo phien phuc vu"}
              </button>
            </div>
          </form>
        </div>

        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>Danh sach ban dang phuc vu</h3>
            <p>Chon phien dang mo de xem thong tin chi tiet va goi mon.</p>
          </div>

          {loadingWorkspace ? (
            <div className="screen-state" style={{ minHeight: 240 }}>
              Dang tai phien phuc vu...
            </div>
          ) : (
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
                    <small>{session.guest_count} khach | Tam tinh {formatCurrency(session.open_order_total || 0)}</small>
                  </button>
                ))
              ) : (
                <p className="muted-text">Chua co phien phuc vu nao dang mo.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>Workspace goi mon</h3>
          <p>Chon mot phien phuc vu ben tren de tao order, them mon, cap nhat so luong va xoa mon.</p>
        </div>

        {selectedSessionId ? (
          loadingSessionDetails ? (
            <div className="screen-state" style={{ minHeight: 220 }}>
              Dang tai chi tiet phien...
            </div>
          ) : (
            <div className="app-grid-2">
              <div className="stack-card">
                <div className="summary-grid">
                  <div className="summary-box">
                    <span>Session</span>
                    <strong>{selectedSession?.session_code}</strong>
                    <small>{selectedTableNames}</small>
                  </div>

                  <div className="summary-box">
                    <span>Khach</span>
                    <strong>{selectedSession?.customer_name || "Khach vang lai"}</strong>
                    <small>{selectedSession?.guest_count} khach</small>
                  </div>

                  <div className="summary-box">
                    <span>Order</span>
                    <strong>{selectedOrder?.order_code || "Chua tao"}</strong>
                    <small>{selectedOrder ? formatCurrency(selectedOrder.total_amount) : "Tao order de bat dau goi mon."}</small>
                  </div>
                </div>

                <div className="micro-stats">
                  <div className="micro-stat">
                    <span>Mon dang loc</span>
                    <strong>{filteredMenu.length}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Mon trong order</span>
                    <strong>{orderItemCount}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Tam tinh</span>
                    <strong>{formatCurrency(selectedOrder?.total_amount || 0)}</strong>
                  </div>
                </div>

                {!selectedOrder ? (
                  <button type="button" className="primary-button" onClick={handleCreateOrder} disabled={creatingOrder}>
                    {creatingOrder ? "Dang tao order..." : "Tao order cho phien nay"}
                  </button>
                ) : (
                  <>
                    <div className="section-heading">
                      <h3>Them mon vao order</h3>
                      <p>Loc mon an theo ten hoac loai, sau do chon mon va nhap so luong.</p>
                    </div>

                    <div className="soft-banner">
                      <strong>{filteredMenu.length} mon phu hop</strong>
                      <span>Bo loc ho tro thao tac nhanh theo ten mon hoac nhom mon.</span>
                    </div>

                    <form className="row g-3" onSubmit={handleAddOrderItem}>
                      <div className="col-md-12">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Loc mon an theo ten hoac loai"
                          value={menuFilter}
                          onChange={(event) => setMenuFilter(event.target.value)}
                        />
                      </div>

                      <div className="col-md-7">
                        <select
                          className="form-select"
                          value={itemForm.item_id}
                          onChange={(event) =>
                            setItemForm((currentValue) => ({ ...currentValue, item_id: event.target.value }))
                          }
                          required
                        >
                          <option value="">Chon mon an</option>
                          {filteredMenu.map((item) => (
                            <option key={item.item_id} value={item.item_id}>
                              {item.item_name} - {item.category} - {formatCurrency(item.price)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-2">
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          value={itemForm.quantity}
                          onChange={(event) =>
                            setItemForm((currentValue) => ({ ...currentValue, quantity: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="col-md-3 d-grid">
                        <button type="submit" className="primary-button" disabled={addingItem}>
                          {addingItem ? "Dang them..." : "Them mon"}
                        </button>
                      </div>

                      <div className="col-md-12">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ghi chu mon an"
                          value={itemForm.notes}
                          onChange={(event) => setItemForm((currentValue) => ({ ...currentValue, notes: event.target.value }))}
                        />
                      </div>
                    </form>
                  </>
                )}
              </div>

              <div className="stack-card">
                {selectedOrder ? (
                  <>
                    <div className="section-heading">
                      <h3>Chi tiet order</h3>
                      <p>Cap nhat so luong tung mon hoac xoa mon neu khach doi y.</p>
                    </div>

                    <div className="table-shell">
                      <table className="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Mon</th>
                            <th>SL</th>
                            <th>Thanh tien</th>
                            <th></th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedOrder.items.length ? (
                            selectedOrder.items.map((item) => (
                              <tr key={item.order_item_id}>
                                <td>
                                  <strong>{item.item_name}</strong>
                                  <div className="table-subtext">{item.category}</div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-control form-control-sm"
                                    value={quantityDrafts[item.order_item_id] ?? item.quantity}
                                    onChange={(event) =>
                                      setQuantityDrafts((currentValue) => ({
                                        ...currentValue,
                                        [item.order_item_id]: event.target.value
                                      }))
                                    }
                                  />
                                </td>
                                <td>{formatCurrency(item.line_total)}</td>
                                <td className="action-cell">
                                  <button
                                    type="button"
                                    className="ghost-button button-sm"
                                    onClick={() => handleUpdateOrderItem(item.order_item_id)}
                                    disabled={processingItemId === item.order_item_id}
                                  >
                                    Luu
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-button button-sm danger-button"
                                    onClick={() => handleDeleteOrderItem(item.order_item_id)}
                                    disabled={processingItemId === item.order_item_id}
                                  >
                                    Xoa
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center py-4">
                                Order chua co mon nao.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-box total-box">
                      <span>Tong tam tinh</span>
                      <strong>{formatCurrency(selectedOrder.total_amount || 0)}</strong>
                      <small>Qua man Thanh toan de ket thuc phien nay.</small>
                    </div>
                  </>
                ) : (
                  <div className="empty-card" style={{ padding: 22 }}>
                    <span className="eyebrow">Order</span>
                    <h3 style={{ margin: "14px 0 8px" }}>Chua co order dang mo</h3>
                    <p>Hay chon mot phien va tao order de bat dau nhap mon cho ban nay.</p>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="empty-card">
            <span className="eyebrow">No session</span>
            <h3 style={{ margin: "14px 0 8px" }}>Chua co phien phuc vu nao duoc chon</h3>
            <p>Check-in mot phieu dat ban hoac mo phien vang lai de bat dau goi mon.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SessionsPage;
