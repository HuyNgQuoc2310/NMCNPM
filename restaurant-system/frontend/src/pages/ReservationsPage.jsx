import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { getCurrentTimeValue, getTodayDateValue } from "../utils/formatters";

const initialCustomerForm = {
  full_name: "",
  phone_number: "",
  email: "",
  address: ""
};

function ReservationsPage() {
  const { logout, token, user } = useAuth();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [reservations, setReservations] = useState([]);
  const [reservationFilters, setReservationFilters] = useState({
    date: getTodayDateValue(),
    status: ""
  });
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [slotForm, setSlotForm] = useState({
    date: getTodayDateValue(),
    time: getCurrentTimeValue(),
    guests: "4"
  });
  const [availableTables, setAvailableTables] = useState(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [selectedTableLabel, setSelectedTableLabel] = useState("");

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [reservationNotes, setReservationNotes] = useState("");
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const pendingReservations = reservations.filter((reservation) =>
    ["pending", "confirmed"].includes(reservation.status)
  ).length;
  const checkedInReservations = reservations.filter((reservation) => reservation.status === "checked_in").length;
  const tableOptionCount =
    (availableTables?.single_tables?.length || 0) + (availableTables?.combinations?.length || 0);
  const isReservationReady = Boolean(selectedCustomer && selectedTableIds.length);

  function handleAuthError(error) {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }

  async function fetchReservations(filters = reservationFilters) {
    try {
      setLoadingReservations(true);
      const params = new URLSearchParams();

      if (filters.date) {
        params.set("date", filters.date);
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      const data = await apiFetch(`/reservations?${params.toString()}`, { token });
      setReservations(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoadingReservations(false);
    }
  }

  useEffect(() => {
    fetchReservations(reservationFilters);
  }, [token]);

  function handleSlotChange(event) {
    setSlotForm((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function selectTableOption(tableIds, label) {
    setSelectedTableIds(tableIds);
    setSelectedTableLabel(label);
  }

  async function handleFindTables(event) {
    event.preventDefault();

    try {
      setLoadingTables(true);
      setFeedback({ type: "", message: "" });
      const params = new URLSearchParams({
        date: slotForm.date,
        time: slotForm.time,
        guests: slotForm.guests
      });
      const data = await apiFetch(`/reservations/available-tables?${params.toString()}`, { token });
      setAvailableTables(data);
      setSelectedTableIds([]);
      setSelectedTableLabel("");
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoadingTables(false);
    }
  }

  async function handleSearchCustomers(event) {
    event.preventDefault();

    try {
      setLoadingCustomers(true);
      const params = new URLSearchParams();
      if (customerKeyword.trim()) {
        params.set("keyword", customerKeyword.trim());
      }

      const query = params.toString();
      const data = await apiFetch(`/customers${query ? `?${query}` : ""}`, { token });
      setCustomerResults(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoadingCustomers(false);
    }
  }

  function handleCustomerFormChange(event) {
    setCustomerForm((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();

    try {
      setCreatingCustomer(true);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch("/customers", {
        method: "POST",
        token,
        body: customerForm
      });

      const customer = {
        customer_id: response.customerId,
        customer_code: response.customerCode,
        full_name: customerForm.full_name,
        phone_number: customerForm.phone_number,
        email: customerForm.email,
        address: customerForm.address
      };

      setSelectedCustomer(customer);
      setCustomerResults((currentValue) => [customer, ...currentValue]);
      setCustomerForm(initialCustomerForm);
      setFeedback({ type: "success", message: "Da tao khach hang moi va chon vao phieu dat." });
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function handleCreateReservation(event) {
    event.preventDefault();

    if (!selectedCustomer) {
      setFeedback({ type: "error", message: "Can chon khach hang truoc khi tao phieu dat." });
      return;
    }

    if (!selectedTableIds.length) {
      setFeedback({ type: "error", message: "Can chon ban hoac to hop ban truoc khi tao phieu dat." });
      return;
    }

    try {
      setSubmittingReservation(true);
      setFeedback({ type: "", message: "" });

      await apiFetch("/reservations", {
        method: "POST",
        token,
        body: {
          customer_id: selectedCustomer.customer_id,
          employee_id: user.employee_id,
          reservation_date: slotForm.date,
          reservation_time: slotForm.time,
          number_of_guests: Number(slotForm.guests),
          table_ids: selectedTableIds,
          notes: reservationNotes
        }
      });

      setSelectedTableIds([]);
      setSelectedTableLabel("");
      setReservationNotes("");
      setAvailableTables(null);
      setFeedback({ type: "success", message: "Da tao phieu dat ban thanh cong." });
      await fetchReservations();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmittingReservation(false);
    }
  }

  async function handleCheckIn(reservationId) {
    try {
      setCheckingInId(reservationId);
      setFeedback({ type: "", message: "" });
      await apiFetch(`/reservations/${reservationId}/check-in`, {
        method: "POST",
        token,
        body: {
          employee_id: user.employee_id,
          notes: "Check-in tu frontend"
        }
      });

      setFeedback({ type: "success", message: "Check-in thanh cong. Ban nay da san sang goi mon." });
      await fetchReservations();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setCheckingInId(null);
    }
  }

  return (
    <section className="workspace-grid">
      <div className="ops-hero">
        <div className="ops-copy">
          <span className="eyebrow">Reservation flow</span>
          <h1>Dat ban va check-in</h1>
          <p>
            Giao dien nay gom 3 buoc lien mach: tim ban trong, chon khach hang, xac nhan phieu dat va check-in de
            chuyen sang phien phuc vu.
          </p>
        </div>

        <div className="ops-kpis">
          <article className="ops-kpi">
            <span>Phieu cho xu ly</span>
            <strong>{pendingReservations}</strong>
            <small>Dang o trang thai pending hoac confirmed.</small>
          </article>

          <article className="ops-kpi">
            <span>Da check-in</span>
            <strong>{checkedInReservations}</strong>
            <small>San sang chuyen sang goi mon.</small>
          </article>

          <article className="ops-kpi">
            <span>Lua chon ban</span>
            <strong>{tableOptionCount}</strong>
            <small>Cap nhat sau moi lan tim ban trong.</small>
          </article>
        </div>
      </div>

      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flow-strip">
        <article className={`flow-step${tableOptionCount ? " active" : ""}`}>
          <span>Buoc 1</span>
          <strong>Tim ban</strong>
          <small>Tra ve ban don va to hop ban cho khung gio mong muon.</small>
        </article>

        <article className={`flow-step${selectedCustomer ? " active" : ""}`}>
          <span>Buoc 2</span>
          <strong>Chon khach hang</strong>
          <small>Tim nhanh theo SDT hoac tao khach moi ngay tai quay.</small>
        </article>

        <article className={`flow-step${isReservationReady ? " active" : ""}`}>
          <span>Buoc 3</span>
          <strong>Xac nhan phieu</strong>
          <small>Chot thong tin va check-in de mo luong goi mon.</small>
        </article>
      </div>

      <div className="app-grid-2">
        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>1. Tim ban trong</h3>
            <p>Nhap ngay gio va so khach de lay danh sach ban hoac to hop ban kha dung.</p>
          </div>

          <form className="row g-3" onSubmit={handleFindTables}>
            <div className="col-md-4">
              <input
                type="date"
                name="date"
                className="form-control"
                value={slotForm.date}
                onChange={handleSlotChange}
                required
              />
            </div>

            <div className="col-md-4">
              <input
                type="time"
                name="time"
                className="form-control"
                value={slotForm.time}
                onChange={handleSlotChange}
                required
              />
            </div>

            <div className="col-md-2">
              <input
                type="number"
                min="1"
                name="guests"
                className="form-control"
                value={slotForm.guests}
                onChange={handleSlotChange}
                required
              />
            </div>

            <div className="col-md-2 d-grid">
              <button type="submit" className="primary-button" disabled={loadingTables}>
                {loadingTables ? "Dang tim..." : "Tim ban"}
              </button>
            </div>
          </form>

          {availableTables ? (
            <div className="stack-card">
              <div className="soft-banner">
                <strong>{tableOptionCount} lua chon kha dung</strong>
                <span>
                  {availableTables.single_tables.length} ban don va {availableTables.combinations.length} to hop ban
                  cho {slotForm.guests} khach.
                </span>
              </div>

              <div>
                <h4 className="mini-title">Ban don phu hop</h4>
                <div className="selection-grid">
                  {availableTables.single_tables.length ? (
                    availableTables.single_tables.map((table) => {
                      const isSelected = selectedTableIds.length === 1 && selectedTableIds[0] === table.table_id;

                      return (
                        <button
                          key={`single-${table.table_id}`}
                          type="button"
                          className={`select-card${isSelected ? " selected" : ""}`}
                          onClick={() => selectTableOption([table.table_id], `${table.table_name} (${table.capacity} khach)`)}
                        >
                          <strong>{table.table_name}</strong>
                          <span>{table.capacity} khach</span>
                          <small>{table.description || "Ban don"}</small>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted-text">Khong co ban don nao du suc chua.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mini-title">To hop ban</h4>
                <div className="selection-grid">
                  {availableTables.combinations.length ? (
                    availableTables.combinations.map((combo) => {
                      const isSelected =
                        combo.table_ids.length === selectedTableIds.length &&
                        combo.table_ids.every((tableId) => selectedTableIds.includes(tableId));

                      return (
                        <button
                          key={`combo-${combo.table_ids.join("-")}`}
                          type="button"
                          className={`select-card${isSelected ? " selected" : ""}`}
                          onClick={() => selectTableOption(combo.table_ids, combo.description)}
                        >
                          <strong>{combo.description}</strong>
                          <span>{combo.total_capacity} khach</span>
                          <small>{combo.table_names.join(", ")}</small>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted-text">Khong co to hop ban nao phu hop voi khung gio nay.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>2. Tim hoac tao khach hang</h3>
            <p>Co the tim theo ten, so dien thoai hoac tao nhanh neu khach chua ton tai.</p>
          </div>

          <form className="row g-3" onSubmit={handleSearchCustomers}>
            <div className="col-md-9">
              <input
                type="text"
                className="form-control"
                placeholder="Nhap ten, SDT hoac ma khach hang"
                value={customerKeyword}
                onChange={(event) => setCustomerKeyword(event.target.value)}
              />
            </div>

            <div className="col-md-3 d-grid">
              <button type="submit" className="ghost-button" disabled={loadingCustomers}>
                {loadingCustomers ? "Dang tim..." : "Tim KH"}
              </button>
            </div>
          </form>

          {selectedCustomer ? (
            <div className="picked-banner">
              <div>
                <span>Khach dang duoc chon</span>
                <strong>{selectedCustomer.full_name}</strong>
              </div>
              <small>{selectedCustomer.phone_number}</small>
            </div>
          ) : null}

          <div className="selection-grid">
            {customerResults.map((customer) => (
              <button
                key={customer.customer_id}
                type="button"
                className={`select-card${selectedCustomer?.customer_id === customer.customer_id ? " selected" : ""}`}
                onClick={() => setSelectedCustomer(customer)}
              >
                <strong>{customer.full_name}</strong>
                <span>{customer.phone_number}</span>
                <small>{customer.email || customer.address || "Khach hang da luu"}</small>
              </button>
            ))}
          </div>

          <form className="row g-3" onSubmit={handleCreateCustomer}>
            <div className="col-md-6">
              <input
                type="text"
                name="full_name"
                className="form-control"
                placeholder="Ten khach hang"
                value={customerForm.full_name}
                onChange={handleCustomerFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="phone_number"
                className="form-control"
                placeholder="So dien thoai"
                value={customerForm.phone_number}
                onChange={handleCustomerFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Email"
                value={customerForm.email}
                onChange={handleCustomerFormChange}
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="address"
                className="form-control"
                placeholder="Dia chi"
                value={customerForm.address}
                onChange={handleCustomerFormChange}
              />
            </div>

            <div className="col-12 d-grid">
              <button type="submit" className="ghost-button" disabled={creatingCustomer}>
                {creatingCustomer ? "Dang tao..." : "Them KH moi va chon vao phieu"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>3. Xac nhan phieu dat</h3>
          <p>Chot khach hang, ban da chon va tao phieu dat moi.</p>
        </div>

        <div className="summary-grid">
          <div className={`summary-box${selectedCustomer ? " summary-box-accent" : ""}`}>
            <span>Khach hang</span>
            <strong>{selectedCustomer ? selectedCustomer.full_name : "Chua chon"}</strong>
            <small>{selectedCustomer ? selectedCustomer.phone_number : "Hay tim hoac tao khach hang."}</small>
          </div>

          <div className={`summary-box${selectedTableIds.length ? " summary-box-accent" : ""}`}>
            <span>Ban duoc chon</span>
            <strong>{selectedTableLabel || "Chua chon ban"}</strong>
            <small>{selectedTableIds.length ? `Table IDs: ${selectedTableIds.join(", ")}` : "Tim ban trong truoc."}</small>
          </div>

          <div className="summary-box">
            <span>Lich dat</span>
            <strong>
              {slotForm.date} {slotForm.time}
            </strong>
            <small>{slotForm.guests} khach</small>
          </div>
        </div>

        <div className="soft-banner">
          <strong>{isReservationReady ? "San sang tao phieu dat" : "Phieu chua day du thong tin"}</strong>
          <span>
            {isReservationReady
              ? "Ban da chon du khach hang va ban. Co the luu phieu dat ngay."
              : "Can chon ca khach hang va ban truoc khi xac nhan."}
          </span>
        </div>

        <form className="row g-3" onSubmit={handleCreateReservation}>
          <div className="col-md-10">
            <input
              type="text"
              className="form-control"
              placeholder="Ghi chu cho phieu dat"
              value={reservationNotes}
              onChange={(event) => setReservationNotes(event.target.value)}
            />
          </div>

          <div className="col-md-2 d-grid">
            <button type="submit" className="primary-button" disabled={submittingReservation}>
              {submittingReservation ? "Dang luu..." : "Tao phieu"}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>Danh sach dat ban</h3>
          <p>Co the loc theo ngay va check-in nhanh de chuyen sang phien phuc vu.</p>
        </div>

        <div className="micro-stats">
          <div className="micro-stat">
            <span>Tong phieu</span>
            <strong>{reservations.length}</strong>
          </div>

          <div className="micro-stat">
            <span>Cho check-in</span>
            <strong>{pendingReservations}</strong>
          </div>

          <div className="micro-stat">
            <span>Da vao ban</span>
            <strong>{checkedInReservations}</strong>
          </div>
        </div>

        <form
          className="row g-3"
          onSubmit={(event) => {
            event.preventDefault();
            fetchReservations();
          }}
        >
          <div className="col-md-4">
            <input
              type="date"
              className="form-control"
              value={reservationFilters.date}
              onChange={(event) =>
                setReservationFilters((currentValue) => ({ ...currentValue, date: event.target.value }))
              }
            />
          </div>

          <div className="col-md-4">
            <select
              className="form-select"
              value={reservationFilters.status}
              onChange={(event) =>
                setReservationFilters((currentValue) => ({ ...currentValue, status: event.target.value }))
              }
            >
              <option value="">Tat ca trang thai</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="checked_in">checked_in</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="col-md-4 d-grid">
            <button type="submit" className="ghost-button">
              Loc danh sach
            </button>
          </div>
        </form>

        {loadingReservations ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Dang tai phieu dat...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Ma phieu</th>
                  <th>Khach hang</th>
                  <th>Ngay gio</th>
                  <th>Ban</th>
                  <th>Trang thai</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {reservations.length ? (
                  reservations.map((reservation) => {
                    const canCheckIn = ["pending", "confirmed"].includes(reservation.status);

                    return (
                      <tr key={reservation.reservation_id}>
                        <td>{reservation.reservation_code}</td>
                        <td>
                          <strong>{reservation.customer_name}</strong>
                          <div className="table-subtext">{reservation.phone_number}</div>
                        </td>
                        <td>
                          {reservation.reservation_date} {reservation.reservation_time}
                          <div className="table-subtext">{reservation.number_of_guests} khach</div>
                        </td>
                        <td>{reservation.table_names}</td>
                        <td>
                          <span className={`status-pill status-${reservation.status}`}>{reservation.status}</span>
                        </td>
                        <td>
                          {canCheckIn ? (
                            <button
                              type="button"
                              className="ghost-button button-sm"
                              onClick={() => handleCheckIn(reservation.reservation_id)}
                              disabled={checkingInId === reservation.reservation_id}
                            >
                              {checkingInId === reservation.reservation_id ? "Dang check-in..." : "Check-in"}
                            </button>
                          ) : (
                            <span className="table-subtext">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Khong co phieu dat nao trong bo loc hien tai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default ReservationsPage;
