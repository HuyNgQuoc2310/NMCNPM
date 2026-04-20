import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { apiFetch } from "../services/apiClient";
import ModalShell from "./ModalShell";

const initialCustomerForm = {
  full_name: "",
  phone_number: "",
  email: "",
  address: "",
  is_active: "1"
};

const initialFilters = {
  keyword: "",
  active: ""
};

const pageSizeOptions = [5, 10, 20];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function CustomerManager() {
  const { logout, token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [formData, setFormData] = useState(initialCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const debouncedKeyword = useDebouncedValue(filters.keyword, 400);

  const activeCustomersCount = customers.filter((customer) => customer.is_active).length;
  const inactiveCustomersCount = customers.length - activeCustomersCount;
  const isDebouncingKeyword = filters.keyword !== debouncedKeyword;

  const appliedFilters = useMemo(() => ({
    keyword: debouncedKeyword,
    active: filters.active
  }), [debouncedKeyword, filters.active]);

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const buildQuery = useCallback((nextFilters) => {
    const params = new URLSearchParams();

    if (nextFilters.keyword.trim()) {
      params.set("keyword", nextFilters.keyword.trim());
    }

    if (nextFilters.active !== "") {
      params.set("active", nextFilters.active);
    }

    return params.toString();
  }, []);

  const fetchCustomers = useCallback(async (nextFilters) => {
    try {
      setLoading(true);
      const query = buildQuery(nextFilters);
      const data = await apiFetch(`/customers${query ? `?${query}` : ""}`, { token });
      setCustomers(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, handleAuthError, token]);

  useEffect(() => {
    async function syncCustomers() {
      await fetchCustomers(appliedFilters);
    }

    void syncCustomers();
  }, [appliedFilters, fetchCustomers]);

  const sortedCustomers = useMemo(() => {
    const nextCustomers = [...customers];

    nextCustomers.sort((customerA, customerB) => {
      if (sortBy === "name_asc") {
        return compareText(customerA.full_name, customerB.full_name);
      }

      if (sortBy === "name_desc") {
        return compareText(customerB.full_name, customerA.full_name);
      }

      if (sortBy === "code_asc") {
        return compareText(customerA.customer_code, customerB.customer_code);
      }

      if (sortBy === "status") {
        return Number(customerB.is_active) - Number(customerA.is_active) ||
          compareText(customerA.full_name, customerB.full_name);
      }

      return (customerB.customer_id || 0) - (customerA.customer_id || 0);
    });

    return nextCustomers;
  }, [customers, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedCustomers.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, sortedCustomers]);

  const visibleStart = sortedCustomers.length ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, sortedCustomers.length);

  function resetForm() {
    setEditingCustomerId(null);
    setFormData(initialCustomerForm);
  }

  function closeFormModal() {
    if (submitting) {
      return;
    }

    setIsFormModalOpen(false);
    resetForm();
  }

  function openCreateModal() {
    resetForm();
    setFeedback({ type: "", message: "" });
    setIsFormModalOpen(true);
  }

  function handleFilterChange(event) {
    setCurrentPage(1);
    setFilters((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function resetFilters() {
    setFilters(initialFilters);
    setSortBy("latest");
    setPageSize(5);
    setCurrentPage(1);
  }

  function handleSortChange(event) {
    setSortBy(event.target.value);
    setCurrentPage(1);
  }

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  }

  function handleFormChange(event) {
    setFormData((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function startEditing(customer) {
    setEditingCustomerId(customer.customer_id);
    setFormData({
      full_name: customer.full_name || "",
      phone_number: customer.phone_number || "",
      email: customer.email || "",
      address: customer.address || "",
      is_active: customer.is_active ? "1" : "0"
    });
    setFeedback({ type: "", message: "" });
    setIsFormModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });

      await apiFetch(editingCustomerId ? `/customers/${editingCustomerId}` : "/customers", {
        method: editingCustomerId ? "PUT" : "POST",
        token,
        body: {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          email: formData.email,
          address: formData.address,
          is_active: formData.is_active === "1"
        }
      });

      setFeedback({
        type: "success",
        message: editingCustomerId ? "Đã cập nhật khách hàng." : "Đã thêm khách hàng mới."
      });
      setIsFormModalOpen(false);
      resetForm();
      await fetchCustomers(appliedFilters);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteRequest(customer) {
    setDeleteTarget(customer);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingId(deleteTarget.customer_id);
      setFeedback({ type: "", message: "" });
      await apiFetch(`/customers/${deleteTarget.customer_id}`, {
        method: "DELETE",
        token
      });

      if (editingCustomerId === deleteTarget.customer_id) {
        resetForm();
      }

      setDeleteTarget(null);
      setFeedback({ type: "success", message: "Đã xóa khách hàng." });
      await fetchCustomers(appliedFilters);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="workspace-grid">
      {feedback.message ? (
        <div className={`alert-message ${feedback.type === "error" ? "alert-error" : "alert-success"}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="app-grid-2">
        <div className="content-card stack-card">
          <div className="toolbar-inline">
            <div className="section-heading">
              <h3>Bộ lọc khách hàng</h3>
              <p>Tìm theo mã, tên hoac số điện thoại.</p>
            </div>

            <div className="toolbar-actions">
              <button type="button" className="primary-button" onClick={openCreateModal}>
                Thêm khách hàng
              </button>
            </div>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchCustomers({
                keyword: filters.keyword,
                active: filters.active
              });
            }}
          >
            <div className="col-md-7">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhập mã KH, tên hoặc SĐT"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
              <div className="table-subtext">
                {isDebouncingKeyword ? "Đang cập nhật bộ lọc..." : "Tìm kiếm tự động sau 0.4 giây khi dừng gõ."}
              </div>
            </div>

            <div className="col-md-3">
              <select
                name="active"
                className="form-select"
                value={filters.active}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã khóa</option>
              </select>
            </div>

            <div className="col-md- d-grid">
              <button type="submit" className="ghost-button">
                Làm mới ngay
              </button>
            </div>

            <div className="col-12">
              <div className="table-toolbar filter-toolbar">
                <div className="table-toolbar-meta">
                  <strong>{sortedCustomers.length} khách hàng</strong>
                  <span>
                    Sắp xếp và chia trang.
                  </span>
                </div>

                <div className="table-controls-inline">
                  <label className="inline-field">
                    <span>Sắp xếp</span>
                    <select className="form-select mini-select" value={sortBy} onChange={handleSortChange}>
                      <option value="latest">Mới cập nhật</option>
                      <option value="name_asc">Tên A-Z</option>
                      <option value="name_desc">Tên Z-A</option>
                      <option value="code_asc">Mã KH tăng dần</option>
                      <option value="status">Đang hoạt động trước</option>
                    </select>
                  </label>

                  <label className="inline-field">
                    <span>Mỗi trang</span>
                    <select
                      className="form-select mini-select"
                      value={pageSize}
                      onChange={handlePageSizeChange}
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} dòng
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="button" className="ghost-button" onClick={resetFilters}>
                    Đặt lại
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="content-card stack-card">
          <div className="section-heading">
            <h3>Trạng thái khách</h3>
          </div>

          <div className="micro-stats">
            <div className="micro-stat">
              <span>Tổng khách</span>
              <strong>{customers.length}</strong>
            </div>

            <div className="micro-stat">
              <span>Đang hoạt động</span>
              <strong>{activeCustomersCount}</strong>
            </div>

            <div className="micro-stat">
              <span>Đã khóa</span>
              <strong>{inactiveCustomersCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="table-toolbar">
          <div className="section-heading">
            <h3>Danh sách khách hàng</h3>
            <p>Sửa, cập nhật, xóa nếu khách hàng chưa phát sinh đặt bàn.</p>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>
              {visibleStart}-{visibleEnd} / {sortedCustomers.length}
            </strong>
            <span>Trang {safeCurrentPage}/{totalPages}</span>
          </div>
        </div>

        {loading ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải danh sách khách hàng...
          </div>
        ) : (
          <div className="table-shell">
            <table class="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã KH</th>
                  <th>Tên</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Địa chỉ</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {paginatedCustomers.length ? (
                  paginatedCustomers.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className={editingCustomerId === customer.customer_id ? "table-row-active" : ""}
                    >
                      <td>{customer.customer_code}</td>
                      <td>
                        <strong>{customer.full_name}</strong>
                      </td>
                      <td>{customer.phone_number}</td>
                      <td>{customer.email || "--"}</td>
                      <td>{customer.address || "--"}</td>
                      <td>
                        <span className={`status-pill ${customer.is_active ? "status-active" : "status-inactive"}`}>
                          {customer.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button type="button" className="ghost-button button-sm" onClick={() => startEditing(customer)}>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="ghost-button button-sm danger-button"
                          onClick={() => handleDeleteRequest(customer)}
                          disabled={deletingId === customer.customer_id}
                        >
                          {deletingId === customer.customer_id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Không có khách hàng nào theo bộ lọc hiện tại.
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
              onClick={() => setCurrentPage((currentValue) => Math.max(1, currentValue - 1))}
              disabled={safeCurrentPage === 1}
            >
              Trang trước
            </button>

            <span className="pagination-chip">
              {safeCurrentPage}/{totalPages}
            </span>

            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setCurrentPage((currentValue) => Math.min(totalPages, currentValue + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {isFormModalOpen ? (
        <ModalShell
          title={editingCustomerId ? "Cập nhật khách hàng" : "Thêm khách hàng"}
          description="Thông tin này được sử dụng trong đặt bàn và lịch sử phục vụ."
          onClose={closeFormModal}
          size="wide"
          footer={
            <>
              <button type="button" className="ghost-button" onClick={closeFormModal} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" form="customer-form-modal" className="primary-button" disabled={submitting}>
                {submitting ? "Đang lưu..." : editingCustomerId ? "Cập nhật khách hàng" : "Thêm khách hàng"}
              </button>
            </>
          }
        >
          <form id="customer-form-modal" className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-6">
              <input
                type="text"
                name="full_name"
                className="form-control"
                placeholder="Tên khách hàng"
                value={formData.full_name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="phone_number"
                className="form-control"
                placeholder="Số điện thoại"
                value={formData.phone_number}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Email"
                value={formData.email}
                onChange={handleFormChange}
              />
            </div>

            <div className="col-md-6">
              <select
                name="is_active"
                className="form-select"
                value={formData.is_active}
                onChange={handleFormChange}
              >
                <option value="1">Đang hoạt động</option>
                <option value="0">Đã khóa</option>
              </select>
            </div>

            <div className="col-12">
              <input
                type="text"
                name="address"
                className="form-control"
                placeholder="Địa chỉ"
                value={formData.address}
                onChange={handleFormChange}
              />
            </div>
          </form>
        </ModalShell>
      ) : null}

      {deleteTarget ? (
        <ModalShell
          title="Xác nhận xóa khách hàng"
          description="Hành động này không thể hoàn tác nếu khách hàng không còn tồn tại."
          onClose={() => (deletingId ? null : setDeleteTarget(null))}
          size="compact"
          footer={
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.customer_id}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button danger-solid-button"
                onClick={confirmDelete}
                disabled={deletingId === deleteTarget.customer_id}
              >
                {deletingId === deleteTarget.customer_id ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </>
          }
        >
          <div className="confirm-stack">
            <strong>{deleteTarget.full_name}</strong>
            <span>{deleteTarget.phone_number}</span>
            <p>Nếu khách hàng đã từng đặt bàn sẽ tự động từ chối thao tác xóa.</p>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default CustomerManager;
