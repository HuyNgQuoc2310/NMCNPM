import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { formatCurrency } from "../utils/formatters";

const pageSizeOptions = [4, 8, 12];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

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
  const [sessionSortBy, setSessionSortBy] = useState("latest");
  const [sessionPageSize, setSessionPageSize] = useState(4);
  const [sessionPage, setSessionPage] = useState(1);

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

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const fetchBaseData = useCallback(async () => {
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
  }, [handleAuthError, token]);

  useEffect(() => {
    async function syncBaseData() {
      await fetchBaseData();
    }

    void syncBaseData();
  }, [fetchBaseData]);

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

    void fetchSessionDetails();

    return () => {
      cancelled = true;
    };
  }, [handleAuthError, selectedSessionId, token]);

  const sortedSessions = useMemo(() => {
    const nextSessions = [...sessions];

    nextSessions.sort((sessionA, sessionB) => {
      if (sessionSortBy === "table") {
        return compareText(sessionA.table_names, sessionB.table_names);
      }

      if (sessionSortBy === "customer") {
        return compareText(sessionA.customer_name || "Khách vãng lai", sessionB.customer_name || "Khách vãng lai");
      }

      if (sessionSortBy === "guests_desc") {
        return Number(sessionB.guest_count) - Number(sessionA.guest_count) ||
          compareText(sessionA.table_names, sessionB.table_names);
      }

      if (sessionSortBy === "order_total_desc") {
        return Number(sessionB.open_order_total || 0) - Number(sessionA.open_order_total || 0) ||
          compareText(sessionA.table_names, sessionB.table_names);
      }

      return (sessionB.session_id || 0) - (sessionA.session_id || 0);
    });

    return nextSessions;
  }, [sessionSortBy, sessions]);

  const sessionTotalPages = Math.max(1, Math.ceil(sortedSessions.length / sessionPageSize));
  const safeSessionPage = Math.min(sessionPage, sessionTotalPages);

  const paginatedSessions = useMemo(() => {
    const startIndex = (safeSessionPage - 1) * sessionPageSize;
    return sortedSessions.slice(startIndex, startIndex + sessionPageSize);
  }, [safeSessionPage, sessionPageSize, sortedSessions]);

  const visibleSessionStart = sortedSessions.length ? (safeSessionPage - 1) * sessionPageSize + 1 : 0;
  const visibleSessionEnd = Math.min(safeSessionPage * sessionPageSize, sortedSessions.length);

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

  function handleSessionSortChange(event) {
    setSessionSortBy(event.target.value);
    setSessionPage(1);
  }

  function handleSessionPageSizeChange(event) {
    setSessionPageSize(Number(event.target.value));
    setSessionPage(1);
  }

  function resetSessionView() {
    setSessionSortBy("latest");
    setSessionPageSize(4);
    setSessionPage(1);
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
      setFeedback({ type: "success", message: "Đã mở phiên phục vụ cho khách vãng lai." });
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
          notes: "Order tạo từ frontend"
        }
      });

      setSelectedOrder(response.order || response);
      setFeedback({ type: "success", message: "Đã tạo order cho bàn đang phục vụ." });
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
      setFeedback({ type: "error", message: "Cần tạo order trước khi thêm món." });
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
          <h1>Phiên phục vụ và gọi món</h1>
          <p>
            Màn này được tối ưu cho thao tác tại sảnh: mở phiên cho khách vãng lai, chọn bàn đang phục vụ, tạo order
            và cập nhật món ngay trong một workspace.
          </p>
        </div>

        <div className="ops-kpis">
          <article className="ops-kpi">
            <span>Phiên đang mở</span>
            <strong>{openSessionsCount}</strong>
            <small>Số bàn đang phục vụ trong hệ thống.</small>
          </article>

          <article className="ops-kpi">
            <span>Đã có order</span>
            <strong>{sessionsWithOrderCount}</strong>
            <small>Sẵn sàng chuyển sang thanh toán.</small>
          </article>

          <article className="ops-kpi">
            <span>Bàn sẵn sàng</span>
            <strong>{availableWalkInTables.length}</strong>
            <small>Dùng cho khách vãng lai vào trực tiếp.</small>
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
          <span>Bước 1</span>
          <strong>Mở phiên</strong>
          <small>Chọn bàn cho khách vãng lai hoặc nhận phiên từ đặt bàn.</small>
        </article>

        <article className={`flow-step${selectedSessionId ? " active" : ""}`}>
          <span>Bước 2</span>
          <strong>Chọn session</strong>
          <small>Tập trung vào một bàn đang phục vụ để thao tác nhanh.</small>
        </article>

        <article className={`flow-step${selectedOrder ? " active" : ""}`}>
          <span>Bước 3</span>
          <strong>Cập nhật order</strong>
          <small>Thêm món, đổi số lượng và chuẩn bị chuyển sang thanh toán.</small>
        </article>
      </div>

      <div className="workspace-grid">
        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>Khách vãng lai</h3>
            <p>Nếu khách không đặt trước, nhân viên có thể mở phiên phục vụ trực tiếp.</p>
          </div>

          <div className="soft-banner">
            <strong>{walkInForm.table_ids.length ? `${walkInForm.table_ids.length} bàn đã được chọn` : "Chưa chọn bàn"}</strong>
            <span>Số khách hiện tại: {walkInForm.guest_count}. Có thể chọn nhiều bàn nếu đoàn đông.</span>
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
                placeholder="Ghi chú cho phiên phục vụ"
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
                    <span>{table.capacity} khách</span>
                    <small>{table.status}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 d-grid">
              <button type="submit" className="primary-button" disabled={creatingWalkIn}>
                {creatingWalkIn ? "Đang mở..." : "Mở phiên phục vụ"}
              </button>
            </div>
          </form>
        </div>

        <div className="content-card stack-card">
          <div className="table-toolbar">
            <div className="section-heading">
              <h3>Danh sách bàn đang phục vụ</h3>
              <p>Chọn phiên đang mở để xem thông tin chi tiết và gọi món.</p>
            </div>

            <div className="table-toolbar-meta align-end">
              <strong>
                {visibleSessionStart}-{visibleSessionEnd} / {sortedSessions.length}
              </strong>
              <span>Trang {safeSessionPage}/{sessionTotalPages}</span>
            </div>
          </div>

          <div className="table-toolbar filter-toolbar session-filter-toolbar">
            <div className="table-toolbar-meta">
              <strong>{sortedSessions.length} phiên đang mở</strong>
              <span>Sắp xếp theo bàn, khách, số khách hoặc tạm tính để chọn session cần thao tác nhanh hơn.</span>
            </div>

            <div className="table-controls-inline">
              <label className="inline-field">
                <span>Sắp xếp</span>
                <select className="form-select mini-select" value={sessionSortBy} onChange={handleSessionSortChange}>
                  <option value="latest">Mới nhất</option>
                  <option value="table">Tên bàn</option>
                  <option value="customer">Khách hàng</option>
                  <option value="guests_desc">Đông khách trước</option>
                  <option value="order_total_desc">Tạm tính cao trước</option>
                </select>
              </label>

              <label className="inline-field">
                <span>Mỗi trang</span>
                <select className="form-select mini-select" value={sessionPageSize} onChange={handleSessionPageSizeChange}>
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} thẻ
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="ghost-button" onClick={resetSessionView}>
                Đặt lại view
              </button>
            </div>
          </div>

          {loadingWorkspace ? (
            <div className="screen-state" style={{ minHeight: 240 }}>
              Đang tải phiên phục vụ...
            </div>
          ) : (
            <div className="selection-grid">
              {paginatedSessions.length ? (
                paginatedSessions.map((session) => (
                  <button
                    key={session.session_id}
                    type="button"
                    className={`select-card${selectedSessionId === session.session_id ? " selected" : ""}`}
                    onClick={() => setSelectedSessionId(session.session_id)}
                  >
                    <strong>{session.table_names}</strong>
                    <span>{session.customer_name || "Khách vãng lai"}</span>
                    <small>{session.guest_count} khách | Tạm tính {formatCurrency(session.open_order_total || 0)}</small>
                  </button>
                ))
              ) : (
                <p className="muted-text">Chưa có phiên phục vụ nào đang mở.</p>
              )}
            </div>
          )}

          <div className="pagination-bar">
            <div className="table-toolbar-meta">
              <strong>Điều hướng trang</strong>
              <span>Đổi số session mỗi trang để giữ mạnh tốc độ thao tác tại sảnh khi giờ cao điểm.</span>
            </div>

            <div className="pagination-actions">
              <button
                type="button"
                className="ghost-button button-sm"
                onClick={() => setSessionPage((currentValue) => Math.max(1, currentValue - 1))}
                disabled={safeSessionPage === 1}
              >
                Trang trước
              </button>

              <span className="pagination-chip">
                {safeSessionPage}/{sessionTotalPages}
              </span>

              <button
                type="button"
                className="ghost-button button-sm"
                onClick={() => setSessionPage((currentValue) => Math.min(sessionTotalPages, currentValue + 1))}
                disabled={safeSessionPage === sessionTotalPages}
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>Workspace gọi món</h3>
          <p>Chọn một phiên phục vụ bên trên để tạo order, thêm món, cập nhật số lượng và xóa món.</p>
        </div>

        {selectedSessionId ? (
          loadingSessionDetails ? (
            <div className="screen-state" style={{ minHeight: 220 }}>
              Đang tải chi tiết phiên...
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
                    <span>Khách</span>
                    <strong>{selectedSession?.customer_name || "Khách vãng lai"}</strong>
                    <small>{selectedSession?.guest_count} khách</small>
                  </div>

                  <div className="summary-box">
                    <span>Order</span>
                    <strong>{selectedOrder?.order_code || "Chưa tạo"}</strong>
                    <small>{selectedOrder ? formatCurrency(selectedOrder.total_amount) : "Tạo order để bắt đầu gọi món."}</small>
                  </div>
                </div>

                <div className="micro-stats">
                  <div className="micro-stat">
                    <span>Món đang lọc</span>
                    <strong>{filteredMenu.length}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Món trong order</span>
                    <strong>{orderItemCount}</strong>
                  </div>

                  <div className="micro-stat">
                    <span>Tạm tính</span>
                    <strong>{formatCurrency(selectedOrder?.total_amount || 0)}</strong>
                  </div>
                </div>

                {!selectedOrder ? (
                  <button type="button" className="primary-button" onClick={handleCreateOrder} disabled={creatingOrder}>
                    {creatingOrder ? "Đang tạo order..." : "Tạo order cho phiên này"}
                  </button>
                ) : (
                  <>
                    <div className="section-heading">
                      <h3>Thêm món vào order</h3>
                      <p>Lọc món ăn theo tên hoặc loại, sau đó chọn món và nhập số lượng.</p>
                    </div>

                    <div className="soft-banner">
                      <strong>{filteredMenu.length} món phù hợp</strong>
                      <span>Bộ lọc hỗ trợ thao tác nhanh theo tên món hoặc nhóm món.</span>
                    </div>

                    <form className="row g-3" onSubmit={handleAddOrderItem}>
                      <div className="col-md-12">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Lọc món ăn theo tên hoặc loại"
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
                          <option value="">Chọn món ăn</option>
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
                          {addingItem ? "Đang thêm..." : "Thêm món"}
                        </button>
                      </div>

                      <div className="col-md-12">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ghi chú món ăn"
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
                      <h3>Chi tiết order</h3>
                      <p>Cập nhật số lượng từng món hoặc xóa món nếu khách đổi ý.</p>
                    </div>

                    <div className="table-shell">
                      <table className="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Món</th>
                            <th>SL</th>
                            <th>Thành tiền</th>
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
                                <td>
                                  <div className="table-action-row">
                                    <button
                                      type="button"
                                      className="ghost-button button-sm"
                                      onClick={() => handleUpdateOrderItem(item.order_item_id)}
                                      disabled={processingItemId === item.order_item_id}
                                    >
                                      Lưu
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button button-sm danger-button"
                                      onClick={() => handleDeleteOrderItem(item.order_item_id)}
                                      disabled={processingItemId === item.order_item_id}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center py-4">
                                Order chưa có món nào.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-box total-box">
                      <span>Tổng tạm tính</span>
                      <strong>{formatCurrency(selectedOrder.total_amount || 0)}</strong>
                      <small>Qua màn Thanh toán để kết thúc phiên này.</small>
                    </div>
                  </>
                ) : (
                  <div className="empty-card" style={{ padding: 22 }}>
                    <span className="eyebrow">Order</span>
                    <h3 style={{ margin: "14px 0 8px" }}>Chưa có order đang mở</h3>
                    <p>Hãy chọn một phiên và tạo order để bắt đầu nhập món cho bàn này.</p>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="empty-card">
            <span className="eyebrow">No session</span>
            <h3 style={{ margin: "14px 0 8px" }}>Chưa có phiên phục vụ nào được chọn</h3>
            <p>Check-in một phiếu đặt bàn hoặc mở phiên vãng lai để bắt đầu gọi món.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SessionsPage;
