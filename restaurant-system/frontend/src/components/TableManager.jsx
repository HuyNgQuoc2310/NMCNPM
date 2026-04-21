import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { apiFetch } from "../services/apiClient";

const initialTableForm = {
  table_name: "",
  capacity: "",
  description: "",
  status: "available",
  is_active: "1"
};

const initialTableFilters = {
  keyword: "",
  status: ""
};

const pageSizeOptions = [5, 10, 20];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function TableManager({ canManage }) {
  const { logout, token } = useAuth();
  const [tables, setTables] = useState([]);
  const [filters, setFilters] = useState(initialTableFilters);
  const [formData, setFormData] = useState(initialTableForm);
  const [editingTableId, setEditingTableId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const debouncedKeyword = useDebouncedValue(filters.keyword, 400);
  const isDebouncingKeyword = filters.keyword !== debouncedKeyword;

  const appliedFilters = useMemo(() => ({
    keyword: debouncedKeyword,
    status: filters.status
  }), [debouncedKeyword, filters.status]);

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

    if (nextFilters.status) {
      params.set("status", nextFilters.status);
    }

    return params.toString();
  }, []);

  const fetchTables = useCallback(async (nextFilters) => {
    try {
      setLoading(true);
      setFeedback((currentValue) => ({ ...currentValue, message: "" }));
      const query = buildQuery(nextFilters);
      const data = await apiFetch(`/tables${query ? `?${query}` : ""}`, { token });
      setTables(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, handleAuthError, token]);

  useEffect(() => {
    async function syncTables() {
      await fetchTables(appliedFilters);
    }

    void syncTables();
  }, [appliedFilters, fetchTables]);

  const sortedTables = useMemo(() => {
    const nextTables = [...tables];

    nextTables.sort((tableA, tableB) => {
      if (sortBy === "name_asc") {
        return compareText(tableA.table_name, tableB.table_name);
      }

      if (sortBy === "name_desc") {
        return compareText(tableB.table_name, tableA.table_name);
      }

      if (sortBy === "capacity_asc") {
        return Number(tableA.capacity) - Number(tableB.capacity) ||
          compareText(tableA.table_name, tableB.table_name);
      }

      if (sortBy === "capacity_desc") {
        return Number(tableB.capacity) - Number(tableA.capacity) ||
          compareText(tableA.table_name, tableB.table_name);
      }

      if (sortBy === "status") {
        return compareText(tableA.status, tableB.status) ||
          compareText(tableA.table_name, tableB.table_name);
      }

      if (sortBy === "active") {
        return Number(tableB.is_active) - Number(tableA.is_active) ||
          compareText(tableA.table_name, tableB.table_name);
      }

      return (tableB.table_id || 0) - (tableA.table_id || 0);
    });

    return nextTables;
  }, [sortBy, tables]);

  const totalPages = Math.max(1, Math.ceil(sortedTables.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTables = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedTables.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, sortedTables]);

  const visibleStart = sortedTables.length ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, sortedTables.length);

  function resetForm() {
    setEditingTableId(null);
    setFormData(initialTableForm);
  }

  function handleFilterChange(event) {
    setCurrentPage(1);
    setFilters((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function resetFilters() {
    setFilters(initialTableFilters);
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

  function startEditing(table) {
    setEditingTableId(table.table_id);
    setFormData({
      table_name: table.table_name || "",
      capacity: table.capacity || "",
      description: table.description || "",
      status: table.status || "available",
      is_active: table.is_active ? "1" : "0"
    });
    setFeedback({ type: "", message: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });
      await apiFetch(editingTableId ? `/tables/${editingTableId}` : "/tables", {
        method: editingTableId ? "PUT" : "POST",
        token,
        body: {
          table_name: formData.table_name,
          capacity: Number(formData.capacity),
          description: formData.description,
          status: formData.status,
          is_active: formData.is_active === "1"
        }
      });

      setFeedback({
        type: "success",
        message: editingTableId ? "Đã cập nhật bàn ăn." : "Đã thêm bàn ăn mới."
      });
      resetForm();
      await fetchTables(appliedFilters);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(table) {
    const confirmed = window.confirm(`Xóa bàn ${table.table_name}?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(table.table_id);
      setFeedback({ type: "", message: "" });
      await apiFetch(`/tables/${table.table_id}`, {
        method: "DELETE",
        token
      });

      if (editingTableId === table.table_id) {
        resetForm();
      }

      setFeedback({ type: "success", message: "Đã xóa bàn ăn." });
      await fetchTables(appliedFilters);
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

      <div className="app-grid-2 table-workspace-grid">
        <div className="panel-card stack-card">
          <div className="section-heading">
            <h3>Bộ lọc bàn ăn</h3>
            <p>Tìm theo tên bàn, mã bàn, mô tả hoặc lọc nhanh theo trạng thái vận hành.</p>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchTables({
                keyword: filters.keyword,
                status: filters.status
              });
            }}
          >
            <div className="col-md-8">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhập mã bàn, tên bàn hoặc mô tả"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
              <div className="table-subtext">
                {isDebouncingKeyword ? "Đang cập nhật bộ lọc..." : "Tìm kiếm tự động sau 0.4 giây khi dừng gõ."}
              </div>
            </div>

            <div className="col-md-2">
              <select
                name="status"
                className="form-select"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả</option>
                <option value="available">available</option>
                <option value="reserved">reserved</option>
                <option value="occupied">occupied</option>
                <option value="unavailable">unavailable</option>
              </select>
            </div>

            <div className="col-md-auto d-grid">
              <button type="submit" className="ghost-button">
                Làm mới ngay
              </button>
            </div>

            <div className="col-12">
              <div className="table-toolbar filter-toolbar">
                <div className="table-toolbar-meta">
                  <strong>{sortedTables.length} bàn ăn</strong>
                  <span>Bảng dữ liệu đã có sắp xếp theo tên, sức chứa, trạng thái và chia trang để thao tác nhanh hơn.</span>
                </div>

                <div className="table-controls-inline">
                  <label className="inline-field">
                    <span>Sắp xếp</span>
                    <select className="form-select mini-select" value={sortBy} onChange={handleSortChange}>
                      <option value="latest">Mới cập nhật</option>
                      <option value="name_asc">Tên A-Z</option>
                      <option value="name_desc">Tên Z-A</option>
                      <option value="capacity_asc">Sức chứa thấp đến cao</option>
                      <option value="capacity_desc">Sức chứa cao đến thấp</option>
                      <option value="status">Trạng thái</option>
                      <option value="active">Đang mở trước</option>
                    </select>
                  </label>

                  <label className="inline-field">
                    <span>Mỗi trang</span>
                    <select className="form-select mini-select" value={pageSize} onChange={handlePageSizeChange}>
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

        {canManage ? (
          <div className="panel-card stack-card">
            <div className="section-heading">
              <h3>{editingTableId ? "Cập nhật bàn ăn" : "Thêm bàn ăn"}</h3>
              <p>Admin có thể đổi sức chứa, trạng thái, mô tả và mở/khóa bàn ngay trên form này.</p>
            </div>

            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-md-5">
                <input
                  type="text"
                  name="table_name"
                  className="form-control"
                  placeholder="Tên bàn"
                  value={formData.table_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <input
                  type="number"
                  min="1"
                  name="capacity"
                  className="form-control"
                  placeholder="Sức chứa"
                  value={formData.capacity}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleFormChange}
                >
                  <option value="available">available</option>
                  <option value="reserved">reserved</option>
                  <option value="occupied">occupied</option>
                  <option value="unavailable">unavailable</option>
                </select>
              </div>

              <div className="col-md-8">
                <input
                  type="text"
                  name="description"
                  className="form-control"
                  placeholder="Mô tả bàn"
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-md-4">
                <select
                  name="is_active"
                  className="form-select"
                  value={formData.is_active}
                  onChange={handleFormChange}
                >
                  <option value="1">Đang mở</option>
                  <option value="0">Tạm khóa</option>
                </select>
              </div>

              <div className="col-md-6 d-grid">
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Đang lưu..." : editingTableId ? "Cập nhật bàn" : "Thêm bàn"}
                </button>
              </div>

              <div className="col-md-6 d-grid">
                <button type="button" className="ghost-button" onClick={resetForm} disabled={submitting}>
                  Bỏ form
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="panel-card stack-card">
            <div className="section-heading">
              <h3>Quyền staff</h3>
              <p>Tài khoản staff chỉ được xem thông tin bàn, sức chứa và trạng thái phục vụ.</p>
            </div>

            <div className="soft-banner">
              <strong>Chế độ chỉ xem</strong>
              <span>Bạn vẫn có thể lọc nhanh để tìm bàn phù hợp khi tiếp nhận đặt bàn hoặc check-in.</span>
            </div>
          </div>
        )}
      </div>

      <div className="content-card stack-card">
        <div className="table-toolbar">
          <div className="section-heading">
            <h3>Danh sách bàn ăn</h3>
            <p>Bảng bàn ăn đã có chia trang và sắp xếp đồng bộ với các module quản trị khác.</p>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>
              {visibleStart}-{visibleEnd} / {sortedTables.length}
            </strong>
            <span>Trang {safeCurrentPage}/{totalPages}</span>
          </div>
        </div>

        {loading ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải danh sách bàn...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã bàn</th>
                  <th>Tên bàn</th>
                  <th>Sức chứa</th>
                  <th>Trạng thái</th>
                  <th>Mở/khóa</th>
                  <th>Mô tả</th>
                  {canManage ? <th></th> : null}
                </tr>
              </thead>

              <tbody>
                {paginatedTables.length ? (
                  paginatedTables.map((table) => (
                    <tr key={table.table_id} className={editingTableId === table.table_id ? "table-row-active" : ""}>
                      <td>{table.table_code}</td>
                      <td>{table.table_name}</td>
                      <td>{table.capacity} khách</td>
                      <td>
                        <span className={`status-pill status-${table.status}`}>{table.status}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${table.is_active ? "status-active" : "status-inactive"}`}>
                          {table.is_active ? "đang_mở" : "tạm_khóa"}
                        </span>
                      </td>
                      <td>{table.description || "--"}</td>
                      {canManage ? (
                        <td className="action-cell">
                          <button type="button" className="ghost-button button-sm" onClick={() => startEditing(table)}>
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="ghost-button button-sm danger-button"
                            onClick={() => handleDelete(table)}
                            disabled={deletingId === table.table_id}
                          >
                            {deletingId === table.table_id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManage ? "7" : "6"} className="text-center py-4">
                      Chưa có dữ liệu bàn ăn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <div className="table-toolbar-meta">
            <strong>Điều hướng trang</strong>
            <span>Nếu số lượng bàn nhiều, bạn có thể giảm số dòng mỗi trang để thao tác và demo dễ hơn.</span>
          </div>

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
    </div>
  );
}

export default TableManager;
