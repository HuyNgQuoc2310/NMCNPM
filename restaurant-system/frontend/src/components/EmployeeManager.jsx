import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { apiFetch } from "../services/apiClient";
import ModalShell from "./ModalShell";

const initialEmployeeForm = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  phone_number: "",
  position: "",
  role: "staff",
  address: "",
  is_active: "1"
};

const initialFilters = {
  keyword: "",
  role: "",
  active: ""
};

const pageSizeOptions = [5, 10, 20];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function EmployeeManager() {
  const { logout, refreshProfile, token, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [formData, setFormData] = useState(initialEmployeeForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
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

  const isEditingSelf = editingEmployeeId === user?.employee_id;
  const adminCount = employees.filter((employee) => employee.role === "admin").length;
  const staffCount = employees.filter((employee) => employee.role === "staff").length;
  const activeCount = employees.filter((employee) => employee.is_active).length;
  const isDebouncingKeyword = filters.keyword !== debouncedKeyword;

  const appliedFilters = useMemo(() => ({
    keyword: debouncedKeyword,
    role: filters.role,
    active: filters.active
  }), [debouncedKeyword, filters.active, filters.role]);

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

    if (nextFilters.role) {
      params.set("role", nextFilters.role);
    }

    if (nextFilters.active !== "") {
      params.set("active", nextFilters.active);
    }

    return params.toString();
  }, []);

  const fetchEmployees = useCallback(async (nextFilters) => {
    try {
      setLoading(true);
      const query = buildQuery(nextFilters);
      const data = await apiFetch(`/employees${query ? `?${query}` : ""}`, { token });
      setEmployees(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, handleAuthError, token]);

  useEffect(() => {
    async function syncEmployees() {
      await fetchEmployees(appliedFilters);
    }

    void syncEmployees();
  }, [appliedFilters, fetchEmployees]);

  const sortedEmployees = useMemo(() => {
    const nextEmployees = [...employees];

    nextEmployees.sort((employeeA, employeeB) => {
      if (sortBy === "name_asc") {
        return compareText(employeeA.full_name, employeeB.full_name);
      }

      if (sortBy === "name_desc") {
        return compareText(employeeB.full_name, employeeA.full_name);
      }

      if (sortBy === "role") {
        return compareText(employeeA.role, employeeB.role) ||
          compareText(employeeA.full_name, employeeB.full_name);
      }

      if (sortBy === "status") {
        return Number(employeeB.is_active) - Number(employeeA.is_active) ||
          compareText(employeeA.full_name, employeeB.full_name);
      }

      return (employeeB.employee_id || 0) - (employeeA.employee_id || 0);
    });

    return nextEmployees;
  }, [employees, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedEmployees.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, sortedEmployees]);

  const visibleStart = sortedEmployees.length ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, sortedEmployees.length);

  function resetForm() {
    setEditingEmployeeId(null);
    setFormData(initialEmployeeForm);
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

  function startEditing(employee) {
    setEditingEmployeeId(employee.employee_id);
    setFormData({
      username: employee.username || "",
      password: "",
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone_number: employee.phone_number || "",
      position: employee.position || "",
      role: employee.role || "staff",
      address: employee.address || "",
      is_active: employee.is_active ? "1" : "0"
    });
    setFeedback({ type: "", message: "" });
    setIsFormModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });

      await apiFetch(editingEmployeeId ? `/employees/${editingEmployeeId}` : "/employees", {
        method: editingEmployeeId ? "PUT" : "POST",
        token,
        body: {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          position: formData.position,
          role: formData.role,
          address: formData.address,
          is_active: formData.is_active === "1"
        }
      });

      if (editingEmployeeId === user?.employee_id) {
        await refreshProfile();
      }

      setFeedback({
        type: "success",
        message: editingEmployeeId ? "Đã cập nhật nhân viên." : "Đã tạo tài khoản nhân viên mới."
      });
      setIsFormModalOpen(false);
      resetForm();
      await fetchEmployees(appliedFilters);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteRequest(employee) {
    setDeleteTarget(employee);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingId(deleteTarget.employee_id);
      setFeedback({ type: "", message: "" });
      await apiFetch(`/employees/${deleteTarget.employee_id}`, {
        method: "DELETE",
        token
      });

      if (editingEmployeeId === deleteTarget.employee_id) {
        resetForm();
      }

      setDeleteTarget(null);
      setFeedback({ type: "success", message: "Đã xóa nhân viên." });
      await fetchEmployees(appliedFilters);
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
              <h3>Bộ lọc nhân viên</h3>
              <p>Tìm theo mã, username, tên, chức vụ.</p>
            </div>

            <div className="toolbar-actions">
              <button type="button" className="primary-button" onClick={openCreateModal}>
                Thêm nhân viên
              </button>
            </div>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchEmployees({
                keyword: filters.keyword,
                role: filters.role,
                active: filters.active
              });
            }}
          >
            <div className="col-md-5">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhập mã NV, username, tên hoặc chức vụ"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
              <div className="table-subtext">
                {isDebouncingKeyword ? "Đang cập nhật bộ lọc..." : "ìm kiếm tự động sau 0.4 giây khi dừng gõ."}
              </div>
            </div>

            <div className="col-md-3">
              <select
                name="role"
                className="form-select"
                value={filters.role}
                onChange={handleFilterChange}
              >
                <option value="">Chức vụ</option>
                <option value="admin">admin</option>
                <option value="staff">staff</option>
              </select>
            </div>

            <div className="col-md-2">
              <select
                name="active"
                className="form-select"
                value={filters.active}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả</option>
                <option value="true">Hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </div>

            <div className="col-md-2 d-grid">
              <button type="submit" className="ghost-button">
                Làm mới ngay
              </button>
            </div>

            <div className="col-12">
              <div className="table-toolbar filter-toolbar">
                <div className="table-toolbar-meta">
                  <strong>{sortedEmployees.length} nhân viên</strong>
                  <span>Đã áp dụng bộ lọc và sắp xếp.</span>
                </div>

                <div className="table-controls-inline">
                  <label className="inline-field">
                    <span>Sắp xếp</span>
                    <select className="form-select mini-select" value={sortBy} onChange={handleSortChange}>
                      <option value="latest">Mới cập nhật</option>
                      <option value="name_asc">Tên A-Z</option>
                      <option value="name_desc">Tên Z-A</option>
                      <option value="role">Chức vụ trước</option>
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
            <h3>Trạng thái</h3>
            </div>

          <div className="micro-stats">
            <div className="micro-stat">
              <span>Admin</span>
              <strong>{adminCount}</strong>
            </div>

            <div className="micro-stat">
              <span>Staff</span>
              <strong>{staffCount}</strong>
            </div>

            <div className="micro-stat">
              <span>Dang hoat dong</span>
              <strong>{activeCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card stack-card">
        <div className="table-toolbar">
          <div className="section-heading">
            <h3>Danh sách nhân viên</h3>
            <p>Quản lý chức vụ, khóa mở tài khoản và cập nhật thông tin đăng nhập ngay trên bảng dữ liệu.</p>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>
              {visibleStart}-{visibleEnd} / {sortedEmployees.length}
            </strong>
            <span>Trang {safeCurrentPage}/{totalPages}</span>
          </div>
        </div>

        {loading ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải danh sách nhân viên...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Nhân viên</th>
                  <th>Tài khoản</th>
                  <th>Chức vụ</th>
                  <th>Role</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {paginatedEmployees.length ? (
                  paginatedEmployees.map((employee) => {
                    const isCurrentUser = employee.employee_id === user?.employee_id;

                    return (
                      <tr
                        key={employee.employee_id}
                        className={editingEmployeeId === employee.employee_id ? "table-row-active" : ""}
                      >
                        <td>{employee.employee_code}</td>
                        <td>
                          <strong>{employee.full_name}</strong>
                          <div className="table-subtext">{employee.phone_number || employee.email || "--"}</div>
                        </td>
                        <td>
                          {employee.username}
                          {isCurrentUser ? <div className="table-subtext">Tài khoản hiện tại</div> : null}
                        </td>
                        <td>{employee.position}</td>
                        <td>
                          <span className={`status-pill ${employee.role === "admin" ? "status-admin" : "status-staff"}`}>
                            {employee.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${employee.is_active ? "status-active" : "status-inactive"}`}>
                            {employee.is_active ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="action-cell">
                          <button type="button" className="ghost-button button-sm" onClick={() => startEditing(employee)}>
                            Sua
                          </button>
                          <button
                            type="button"
                            className="ghost-button button-sm danger-button"
                            onClick={() => handleDeleteRequest(employee)}
                            disabled={isCurrentUser || deletingId === employee.employee_id}
                            title={isCurrentUser ? "Không thể xóa chính mình." : "Xóa nhân viên"}
                          >
                            {deletingId === employee.employee_id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Không có nhân viên nào theo bộ lọc hiện tại.
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
          title={editingEmployeeId ? "Cap nhat nhan vien" : "Tao tai khoan nhan vien"}
          description="Neu dang sua, bo trong password de giu nguyen mat khau hien tai."
          onClose={closeFormModal}
          size="wide"
          footer={
            <>
              <button type="button" className="ghost-button" onClick={closeFormModal} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" form="employee-form-modal" className="primary-button" disabled={submitting}>
                {submitting ? "Đang lưu..." : editingEmployeeId ? "Cập nhật nhân viên" : "Tạo nhân viên"}
              </button>
            </>
          }
        >
          {isEditingSelf ? (
            <div className="modal-note">
              Bạn đang sửa tài khoản của chính mình. Giao diện khóa field role và trạng thái để tránh hành vi quyền hạn nhầm lẫn.
            </div>
          ) : null}

          <form id="employee-form-modal" className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-6">
              <input
                type="text"
                name="full_name"
                className="form-control"
                placeholder="Họ tên nhân viên"
                value={formData.full_name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="position"
                className="form-control"
                placeholder="Chức vụ"
                value={formData.position}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="username"
                className="form-control"
                placeholder="Username đăng nhập"
                value={formData.username}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder={editingEmployeeId ? "Mật khẩu mới (không bắt buộc)" : "Mật khẩu"}
                value={formData.password}
                onChange={handleFormChange}
                required={!editingEmployeeId}
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
              <input
                type="text"
                name="phone_number"
                className="form-control"
                placeholder="Số điện thoại"
                value={formData.phone_number}
                onChange={handleFormChange}
              />
            </div>

            <div className="col-md-4">
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleFormChange}
                disabled={isEditingSelf}
              >
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="col-md-4">
              <select
                name="is_active"
                className="form-select"
                value={formData.is_active}
                onChange={handleFormChange}
                disabled={isEditingSelf}
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
          title="Xác nhận xóa nhân viên"
          description="Hành động này không thể hoàn tác nếu nhân viên đang được tồn tại."
          onClose={() => (deletingId ? null : setDeleteTarget(null))}
          size="compact"
          footer={
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.employee_id}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button danger-solid-button"
                onClick={confirmDelete}
                disabled={deletingId === deleteTarget.employee_id}
              >
                {deletingId === deleteTarget.employee_id ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </>
          }
        >
          <div className="confirm-stack">
            <strong>{deleteTarget.full_name}</strong>
            <span>{deleteTarget.username}</span>
            <p>Nếu nhân viên đã có đặt bàn, order hoặc payment sẽ tự động từ chối thao tác xóa.</p>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default EmployeeManager;
