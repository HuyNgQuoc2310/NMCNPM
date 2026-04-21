import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { normalizeCustomerFieldValue, normalizeCustomerForm, validateCustomerForm } from "../utils/customerValidation";
import { getCurrentTimeValue, getTodayDateValue } from "../utils/formatters";

const initialCustomerForm = {
  full_name: "",
  phone_number: "",
  email: "",
  address: ""
};

const pageSizeOptions = [5, 10, 20];
const reservationStatusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  checked_in: "Đã check-in",
  completed: "Hoàn tất",
  cancelled: "Đã hủy"
};
const reservationSortLabels = {
  latest: "Mới nhất",
  earliest: "Sớm nhất",
  customer: "Khách hàng",
  guests_desc: "Đông khách trước",
  status: "Trạng thái"
};

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function compareReservationDateTime(reservationA, reservationB) {
  const dateTimeA = new Date(`${reservationA.reservation_date}T${reservationA.reservation_time}`);
  const dateTimeB = new Date(`${reservationB.reservation_date}T${reservationB.reservation_time}`);
  return dateTimeA - dateTimeB;
}

function ReservationsPage() {
  const { logout, token, user } = useAuth();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [reservations, setReservations] = useState([]);
  const [reservationFilters, setReservationFilters] = useState({
    date: getTodayDateValue(),
    status: ""
  });
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [reservationSortBy, setReservationSortBy] = useState("latest");
  const [reservationPageSize, setReservationPageSize] = useState(5);
  const [reservationPage, setReservationPage] = useState(1);

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
  const reservationStatusText = reservationFilters.status
    ? reservationStatusLabels[reservationFilters.status] || reservationFilters.status
    : "Tất cả trạng thái";
  const reservationSortText = reservationSortLabels[reservationSortBy] || reservationSortBy;

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const fetchReservations = useCallback(async (filters) => {
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
  }, [handleAuthError, token]);

  useEffect(() => {
    async function syncReservations() {
      await fetchReservations(reservationFilters);
    }

    void syncReservations();
  }, [fetchReservations, reservationFilters]);

  const sortedReservations = useMemo(() => {
    const nextReservations = [...reservations];

    nextReservations.sort((reservationA, reservationB) => {
      if (reservationSortBy === "earliest") {
        return compareReservationDateTime(reservationA, reservationB);
      }

      if (reservationSortBy === "customer") {
        return compareText(reservationA.customer_name, reservationB.customer_name);
      }

      if (reservationSortBy === "guests_desc") {
        return Number(reservationB.number_of_guests) - Number(reservationA.number_of_guests) ||
          compareReservationDateTime(reservationB, reservationA);
      }

      if (reservationSortBy === "status") {
        return compareText(reservationA.status, reservationB.status) ||
          compareReservationDateTime(reservationB, reservationA);
      }

      return compareReservationDateTime(reservationB, reservationA);
    });

    return nextReservations;
  }, [reservationSortBy, reservations]);

  const reservationTotalPages = Math.max(1, Math.ceil(sortedReservations.length / reservationPageSize));
  const safeReservationPage = Math.min(reservationPage, reservationTotalPages);

  const paginatedReservations = useMemo(() => {
    const startIndex = (safeReservationPage - 1) * reservationPageSize;
    return sortedReservations.slice(startIndex, startIndex + reservationPageSize);
  }, [reservationPageSize, safeReservationPage, sortedReservations]);

  const visibleReservationStart = sortedReservations.length ? (safeReservationPage - 1) * reservationPageSize + 1 : 0;
  const visibleReservationEnd = Math.min(safeReservationPage * reservationPageSize, sortedReservations.length);

  function handleSlotChange(event) {
    setSlotForm((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function handleReservationFilterChange(event) {
    setReservationPage(1);
    setReservationFilters((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function handleReservationSortChange(event) {
    setReservationSortBy(event.target.value);
    setReservationPage(1);
  }

  function handleReservationPageSizeChange(event) {
    setReservationPageSize(Number(event.target.value));
    setReservationPage(1);
  }

  function resetReservationView() {
    setReservationSortBy("latest");
    setReservationPageSize(5);
    setReservationPage(1);
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
    const { name, value } = event.target;

    setCustomerForm((currentValue) => ({
      ...currentValue,
      [name]: normalizeCustomerFieldValue(name, value)
    }));
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();

    const normalizedPayload = normalizeCustomerForm(customerForm);
    const validationMessage = validateCustomerForm(normalizedPayload);

    if (validationMessage) {
      setFeedback({ type: "error", message: validationMessage });
      return;
    }

    try {
      setCreatingCustomer(true);
      setFeedback({ type: "", message: "" });
      const response = await apiFetch("/customers", {
        method: "POST",
        token,
        body: normalizedPayload
      });

      const customer = {
        customer_id: response.customerId,
        customer_code: response.customerCode,
        full_name: normalizedPayload.full_name,
        phone_number: normalizedPayload.phone_number,
        email: normalizedPayload.email,
        address: normalizedPayload.address
      };

      setSelectedCustomer(customer);
      setCustomerResults((currentValue) => [customer, ...currentValue]);
      setCustomerForm(initialCustomerForm);
      setFeedback({ type: "success", message: "Đã tạo khách hàng mới và chọn vào phiếu đặt." });
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
      setFeedback({ type: "error", message: "Cần chọn khách hàng trước khi tạo phiếu đặt." });
      return;
    }

    if (!selectedTableIds.length) {
      setFeedback({ type: "error", message: "Cần chọn bàn hoặc tổ hợp bàn trước khi tạo phiếu đặt." });
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
      setFeedback({ type: "success", message: "Đã tạo phiếu đặt bàn thành công." });
      await fetchReservations(reservationFilters);
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
          notes: "Check-in từ frontend"
        }
      });

      setFeedback({ type: "success", message: "Check-in thành công. Bàn này đã sẵn sàng gọi món." });
      await fetchReservations(reservationFilters);
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
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Reservation flow</span>
            <h1 className="page-intro-title reservations-page-title">Đặt bàn và check-in</h1>
          </div>

          <div className="page-mini-grid reservations-mini-grid">
            <article className="page-mini-card reservations-mini-card">
              <span>Phiếu chờ xử lý</span>
              <strong>{pendingReservations}</strong>
              <small>Đang ở trạng thái pending hoặc confirmed.</small>
            </article>

            <article className="page-mini-card reservations-mini-card">
              <span>Đã check-in</span>
              <strong>{checkedInReservations}</strong>
              <small>Sẵn sàng chuyển sang gọi món.</small>
            </article>

            <article className="page-mini-card reservations-mini-card">
              <span>Lựa chọn bàn</span>
              <strong>{tableOptionCount}</strong>
              <small>Cập nhật sau mỗi lần tìm bàn trống.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Tìm bàn trống</strong>
              <span>Nhập ngày, giờ và số khách để lấy danh sách bàn đơn hoặc tổ hợp bàn còn khả dụng.</span>
            </article>

            <article className="page-side-item">
              <strong>Chọn khách hàng</strong>
              <span>Tìm nhanh theo SĐT hoặc tạo khách mới ngay trên màn hình đặt bàn.</span>
            </article>

            <article className="page-side-item">
              <strong>Xác nhận và check-in</strong>
              <span>Chốt phiếu đặt rồi chuyển thẳng sang phiên phục vụ để tiếp tục gọi món.</span>
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
        <article className={`flow-step${tableOptionCount ? " active" : ""}`}>
          <span>Bước 1</span>
          <strong>Tìm bàn</strong>
          <small>Trả về bàn đơn và tổ hợp bàn cho khung giờ mong muốn.</small>
        </article>

        <article className={`flow-step${selectedCustomer ? " active" : ""}`}>
          <span>Bước 2</span>
          <strong>Chọn khách hàng</strong>
          <small>Tìm nhanh theo SĐT hoặc tạo khách mới ngay tại quầy.</small>
        </article>

        <article className={`flow-step${isReservationReady ? " active" : ""}`}>
          <span>Bước 3</span>
          <strong>Xác nhận phiếu</strong>
          <small>Chốt thông tin và check-in để mở luồng gọi món.</small>
        </article>
      </div>

      <div className="workspace-grid">
        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>1. Tìm bàn trống</h3>
            <p>Nhập ngày giờ và số khách để lấy danh sách bàn hoặc tổ hợp bàn khả dụng.</p>
          </div>

          <div className="filter-panel reservation-search-panel">
            <form className="reservation-search-bar" onSubmit={handleFindTables}>
              <label className="reservation-search-field">
                <span>Ngày</span>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={slotForm.date}
                  onChange={handleSlotChange}
                  required
                />
              </label>

              <label className="reservation-search-field">
                <span>Giờ</span>
                <input
                  type="time"
                  name="time"
                  className="form-control"
                  value={slotForm.time}
                  onChange={handleSlotChange}
                  required
                />
              </label>

              <label className="reservation-search-field reservation-search-guests">
                <span>Số khách</span>
                <input
                  type="number"
                  min="1"
                  name="guests"
                  className="form-control"
                  value={slotForm.guests}
                  onChange={handleSlotChange}
                  required
                />
              </label>

              <button type="submit" className="primary-button reservation-search-button" disabled={loadingTables}>
                {loadingTables ? "Đang tìm..." : "Tìm bàn"}
              </button>
            </form>

            <div className="table-toolbar-meta">
              <strong>Khung đặt đang chọn</strong>
              <span>
                {slotForm.date} lúc {slotForm.time} cho {slotForm.guests} khách
                {selectedTableIds.length ? ` | Đã chọn ${selectedTableIds.length} bàn` : " | Chưa chọn bàn"}
              </span>
            </div>
          </div>

          {availableTables ? (
            <div className="stack-card">
              <div className="soft-banner">
                <strong>{tableOptionCount} lựa chọn khả dụng</strong>
                <span>
                  {availableTables.single_tables.length} bàn đơn và {availableTables.combinations.length} tổ hợp bàn
                  cho {slotForm.guests} khách.
                </span>
              </div>

              <div>
                <h4 className="mini-title">Bàn đơn phù hợp</h4>
                <div className="selection-grid">
                  {availableTables.single_tables.length ? (
                    availableTables.single_tables.map((table) => {
                      const isSelected = selectedTableIds.length === 1 && selectedTableIds[0] === table.table_id;

                      return (
                        <button
                          key={`single-${table.table_id}`}
                          type="button"
                          className={`select-card${isSelected ? " selected" : ""}`}
                          onClick={() => selectTableOption([table.table_id], `${table.table_name} (${table.capacity} khách)`)}
                        >
                          <strong>{table.table_name}</strong>
                          <span>{table.capacity} khách</span>
                          <small>{table.description || "Bàn đơn"}</small>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted-text">Không có bàn đơn nào đủ sức chứa.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mini-title">Tổ hợp bàn</h4>
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
                          <span>{combo.total_capacity} khách</span>
                          <small>{combo.table_names.join(", ")}</small>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted-text">Không có tổ hợp bàn nào phù hợp với khung giờ này.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>2. Tìm hoặc tạo khách hàng</h3>
            <p>Có thể tìm theo tên, số điện thoại hoặc tạo nhanh nếu khách chưa tồn tại.</p>
          </div>

          <div className="filter-panel customer-search-panel">
            <form className="customer-search-bar" onSubmit={handleSearchCustomers}>
              <label className="customer-search-field">
                <span>Tìm khách hàng</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên, SĐT hoặc mã khách hàng"
                  value={customerKeyword}
                  onChange={(event) => setCustomerKeyword(event.target.value)}
                />
              </label>

              <button type="submit" className="ghost-button customer-search-button" disabled={loadingCustomers}>
                {loadingCustomers ? "Đang tìm..." : "Tìm KH"}
              </button>
            </form>

            <div className="table-toolbar-meta">
              <strong>{customerResults.length ? `${customerResults.length} kết quả phù hợp` : "Chưa có kết quả tìm kiếm"}</strong>
              <span>
                {selectedCustomer
                  ? `Đang chọn ${selectedCustomer.full_name} | ${selectedCustomer.phone_number}`
                  : "Có thể chọn khách hàng đã có hoặc tạo mới ngay ở khung bên dưới."}
              </span>
            </div>
          </div>

          {selectedCustomer ? (
            <div className="picked-banner">
              <div>
                <span>Khách đang được chọn</span>
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
                <small>{customer.email || customer.address || "Khách hàng đã lưu"}</small>
              </button>
            ))}
          </div>

          <div className="panel-card stack-card reservation-subpanel">
            <div className="section-heading">
              <h3>Tạo nhanh khách mới</h3>
              <p>Nếu khách chưa tồn tại, nhập nhanh thông tin cơ bản và gắn ngay vào phiếu đặt.</p>
            </div>

            <form className="filter-panel-grid" onSubmit={handleCreateCustomer}>
              <label className="filter-field filter-col-6">
                <span>Tên khách hàng</span>
                <input
                  type="text"
                  name="full_name"
                  className="form-control"
                  placeholder="Nhập tên khách hàng"
                  value={customerForm.full_name}
                  onChange={handleCustomerFormChange}
                  required
                />
              </label>

              <label className="filter-field filter-col-6">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  name="phone_number"
                  className="form-control"
                  placeholder="09xxxxxxxx"
                  value={customerForm.phone_number}
                  onChange={handleCustomerFormChange}
                  inputMode="numeric"
                  maxLength="10"
                  pattern="0[0-9]{9}"
                  title="Số điện thoại phải gồm đúng 10 số và bắt đầu bằng 0."
                  required
                />
              </label>

              <label className="filter-field filter-col-6">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="ten@gmail.com"
                  value={customerForm.email}
                  onChange={handleCustomerFormChange}
                  pattern="[A-Za-z0-9._%+-]+@gmail\.com"
                  title="Email phải có dạng ten@gmail.com."
                />
              </label>

              <label className="filter-field filter-col-6">
                <span>Địa chỉ</span>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  placeholder="Nhập địa chỉ nếu có"
                  value={customerForm.address}
                  onChange={handleCustomerFormChange}
                />
              </label>

              <div className="filter-field filter-col-12">
                <button type="submit" className="ghost-button" disabled={creatingCustomer}>
                  {creatingCustomer ? "Đang tạo..." : "Thêm KH mới và chọn vào phiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>3. Xác nhận phiếu đặt</h3>
          <p>Chốt khách hàng, bàn đã chọn và tạo phiếu đặt mới.</p>
        </div>

        <div className="summary-grid">
          <div className={`summary-box${selectedCustomer ? " summary-box-accent" : ""}`}>
            <span>Khách hàng</span>
            <strong>{selectedCustomer ? selectedCustomer.full_name : "Chưa chọn"}</strong>
            <small>{selectedCustomer ? selectedCustomer.phone_number : "Hãy tìm hoặc tạo khách hàng."}</small>
          </div>

          <div className={`summary-box${selectedTableIds.length ? " summary-box-accent" : ""}`}>
            <span>Bàn được chọn</span>
            <strong>{selectedTableLabel || "Chưa chọn bàn"}</strong>
            <small>{selectedTableIds.length ? `Table IDs: ${selectedTableIds.join(", ")}` : "Tìm bàn trống trước."}</small>
          </div>

          <div className="summary-box">
            <span>Lịch đặt</span>
            <strong>
              {slotForm.date} {slotForm.time}
            </strong>
            <small>{slotForm.guests} khách</small>
          </div>
        </div>

        <div className="soft-banner">
          <strong>{isReservationReady ? "Sẵn sàng tạo phiếu đặt" : "Phiếu chưa đầy đủ thông tin"}</strong>
          <span>
            {isReservationReady
              ? "Bạn đã chọn đủ khách hàng và bàn. Có thể lưu phiếu đặt ngay."
              : "Cần chọn cả khách hàng và bàn trước khi xác nhận."}
          </span>
        </div>

        <form className="row g-3" onSubmit={handleCreateReservation}>
          <div className="col-md-10">
            <input
              type="text"
              className="form-control"
              placeholder="Ghi chú cho phiếu đặt"
              value={reservationNotes}
              onChange={(event) => setReservationNotes(event.target.value)}
            />
          </div>

          <div className="col-md-2 d-grid">
            <button type="submit" className="primary-button" disabled={submittingReservation}>
              {submittingReservation ? "Đang lưu..." : "Tạo phiếu"}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card stack-card">
        <div className="section-heading">
          <h3>Danh sách đặt bàn</h3>
          <p>Có thể lọc theo ngày và check-in nhanh để chuyển sang phiên phục vụ.</p>
        </div>

        <div className="micro-stats">
          <div className="micro-stat">
            <span>Tổng phiếu</span>
            <strong>{reservations.length}</strong>
          </div>

          <div className="micro-stat">
            <span>Chờ check-in</span>
            <strong>{pendingReservations}</strong>
          </div>

          <div className="micro-stat">
            <span>Đã vào bàn</span>
            <strong>{checkedInReservations}</strong>
          </div>
        </div>

        <div className="filter-panel">
          <div className="filter-panel-header">
            <div className="section-heading">
              <h3>Bộ lọc và sắp xếp</h3>
              <p>Sắp xếp theo lịch đặt, khách hàng, số khách hoặc trạng thái và chia trang cho danh sách lớn.</p>
            </div>
          </div>

          <div className="soft-banner">
            <div>
              <strong>Bộ lọc đang áp dụng</strong>
              <span>
                {reservationFilters.date || "Tất cả ngày"} | {reservationStatusText} | {reservationSortText} |{" "}
                {reservationPageSize} dòng / trang
              </span>
            </div>

            <span>{sortedReservations.length} phiếu đặt</span>
          </div>

          <div className="filter-chip-row">
            <div className="filter-chip">
              <span>Ngày</span>
              <strong>{reservationFilters.date || "Tất cả ngày"}</strong>
            </div>

            <div className="filter-chip">
              <span>Trạng thái</span>
              <strong>{reservationStatusText}</strong>
            </div>

            <div className="filter-chip">
              <span>Sắp xếp</span>
              <strong>{reservationSortText}</strong>
            </div>

            <div className="filter-chip">
              <span>Mỗi trang</span>
              <strong>{reservationPageSize} dòng</strong>
            </div>
          </div>

          <form
            className="reservation-list-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchReservations(reservationFilters);
            }}
          >
            <div className="reservation-list-filter-bar">
              <label className="reservation-list-filter-field">
                <span>Ngày đặt</span>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={reservationFilters.date}
                  onChange={handleReservationFilterChange}
                />
              </label>

              <label className="reservation-list-filter-field">
                <span>Trạng thái</span>
                <select
                  name="status"
                  className="form-select"
                  value={reservationFilters.status}
                  onChange={handleReservationFilterChange}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="checked_in">Đã check-in</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>

              <label className="reservation-list-filter-field">
                <span>Sắp xếp</span>
                <select className="form-select" value={reservationSortBy} onChange={handleReservationSortChange}>
                  <option value="latest">Mới nhất</option>
                  <option value="earliest">Sớm nhất</option>
                  <option value="customer">Khách hàng</option>
                  <option value="guests_desc">Đông khách trước</option>
                  <option value="status">Trạng thái</option>
                </select>
              </label>

              <label className="reservation-list-filter-field reservation-list-filter-compact">
                <span>Mỗi trang</span>
                <select className="form-select" value={reservationPageSize} onChange={handleReservationPageSizeChange}>
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} dòng
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="reservation-list-filter-actions">
              <button type="submit" className="primary-button">
                Làm mới danh sách
              </button>

              <button type="button" className="ghost-button" onClick={resetReservationView}>
                Đặt lại view
              </button>
            </div>
          </form>
        </div>

        <div className="table-toolbar">
          <div className="table-toolbar-meta">
            <strong>Khung hiển thị</strong>
            <span>
              {visibleReservationStart}-{visibleReservationEnd} / {sortedReservations.length} phiếu đặt
            </span>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>Trang</strong>
            <span>
              {safeReservationPage}/{reservationTotalPages}
            </span>
          </div>
        </div>

        {loadingReservations ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải phiếu đặt...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Khách hàng</th>
                  <th>Ngày giờ</th>
                  <th>Bàn</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {paginatedReservations.length ? (
                  paginatedReservations.map((reservation) => {
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
                          <div className="table-subtext">{reservation.number_of_guests} khách</div>
                        </td>
                        <td>{reservation.table_names}</td>
                        <td>
                          <span className={`status-pill status-${reservation.status}`}>
                            {reservationStatusLabels[reservation.status] || reservation.status}
                          </span>
                        </td>
                        <td>
                          {canCheckIn ? (
                            <button
                              type="button"
                              className="ghost-button button-sm"
                              onClick={() => handleCheckIn(reservation.reservation_id)}
                              disabled={checkingInId === reservation.reservation_id}
                            >
                              {checkingInId === reservation.reservation_id ? "Đang check-in..." : "Check-in"}
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
                      Không có phiếu đặt nào trong bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <div className="pagination-actions">
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setReservationPage((currentValue) => Math.max(1, currentValue - 1))}
              disabled={safeReservationPage === 1}
            >
              Trang trước
            </button>

            <span className="pagination-chip">
              {safeReservationPage}/{reservationTotalPages}
            </span>

            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setReservationPage((currentValue) => Math.min(reservationTotalPages, currentValue + 1))}
              disabled={safeReservationPage === reservationTotalPages}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReservationsPage;
