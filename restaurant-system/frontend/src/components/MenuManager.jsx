import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { apiFetch } from "../services/apiClient";

const initialMenuForm = {
  category: "",
  item_name: "",
  description: "",
  image_url: "",
  price: "",
  is_available: "1"
};

const initialMenuFilters = {
  keyword: "",
  category: "",
  available: ""
};

const pageSizeOptions = [5, 10, 20];

function compareText(valueA = "", valueB = "") {
  return valueA.localeCompare(valueB, "vi", { sensitivity: "base" });
}

function MenuManager({ canManage }) {
  const { logout, token } = useAuth();
  const [menu, setMenu] = useState([]);
  const [filters, setFilters] = useState(initialMenuFilters);
  const [formData, setFormData] = useState(initialMenuForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const debouncedKeyword = useDebouncedValue(filters.keyword, 400);
  const debouncedCategory = useDebouncedValue(filters.category, 400);
  const isDebouncingText = filters.keyword !== debouncedKeyword || filters.category !== debouncedCategory;

  const appliedFilters = useMemo(() => ({
    keyword: debouncedKeyword,
    category: debouncedCategory,
    available: filters.available
  }), [debouncedCategory, debouncedKeyword, filters.available]);

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

    if (nextFilters.category.trim()) {
      params.set("category", nextFilters.category.trim());
    }

    if (nextFilters.available !== "") {
      params.set("available", nextFilters.available);
    }

    return params.toString();
  }, []);

  const fetchMenu = useCallback(async (nextFilters) => {
    try {
      setLoading(true);
      setFeedback((currentValue) => ({ ...currentValue, message: "" }));
      const query = buildQuery(nextFilters);
      const data = await apiFetch(`/menu${query ? `?${query}` : ""}`, { token });
      setMenu(data);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, handleAuthError, token]);

  useEffect(() => {
    async function syncMenu() {
      await fetchMenu(appliedFilters);
    }

    void syncMenu();
  }, [appliedFilters, fetchMenu]);

  const sortedMenu = useMemo(() => {
    const nextMenu = [...menu];

    nextMenu.sort((itemA, itemB) => {
      if (sortBy === "name_asc") {
        return compareText(itemA.item_name, itemB.item_name);
      }

      if (sortBy === "name_desc") {
        return compareText(itemB.item_name, itemA.item_name);
      }

      if (sortBy === "price_asc") {
        return Number(itemA.price) - Number(itemB.price) ||
          compareText(itemA.item_name, itemB.item_name);
      }

      if (sortBy === "price_desc") {
        return Number(itemB.price) - Number(itemA.price) ||
          compareText(itemA.item_name, itemB.item_name);
      }

      if (sortBy === "category") {
        return compareText(itemA.category, itemB.category) ||
          compareText(itemA.item_name, itemB.item_name);
      }

      if (sortBy === "available") {
        return Number(itemB.is_available) - Number(itemA.is_available) ||
          compareText(itemA.item_name, itemB.item_name);
      }

      return (itemB.item_id || 0) - (itemA.item_id || 0);
    });

    return nextMenu;
  }, [menu, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedMenu.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMenu = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedMenu.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, sortedMenu]);

  const visibleStart = sortedMenu.length ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, sortedMenu.length);

  function resetForm() {
    setEditingItemId(null);
    setFormData(initialMenuForm);
  }

  function handleFilterChange(event) {
    setCurrentPage(1);
    setFilters((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function resetFilters() {
    setFilters(initialMenuFilters);
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

  function startEditing(item) {
    setEditingItemId(item.item_id);
    setFormData({
      category: item.category || "",
      item_name: item.item_name || "",
      description: item.description || "",
      image_url: item.image_url || "",
      price: item.price || "",
      is_available: item.is_available ? "1" : "0"
    });
    setFeedback({ type: "", message: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });
      await apiFetch(editingItemId ? `/menu/${editingItemId}` : "/menu", {
        method: editingItemId ? "PUT" : "POST",
        token,
        body: {
          category: formData.category,
          item_name: formData.item_name,
          description: formData.description,
          image_url: formData.image_url,
          price: Number(formData.price),
          is_available: formData.is_available === "1"
        }
      });

      setFeedback({
        type: "success",
        message: editingItemId ? "Đã cập nhật món ăn." : "Đã thêm món ăn mới."
      });
      resetForm();
      await fetchMenu(appliedFilters);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Xóa món ${item.item_name}?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.item_id);
      setFeedback({ type: "", message: "" });
      await apiFetch(`/menu/${item.item_id}`, {
        method: "DELETE",
        token
      });

      if (editingItemId === item.item_id) {
        resetForm();
      }

      setFeedback({ type: "success", message: "Đã xóa món ăn." });
      await fetchMenu(appliedFilters);
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

      <div className="app-grid-2 menu-workspace-grid">
        <div className="panel-card stack-card">
          <div className="section-heading">
            <h3>Bộ lọc menu</h3>
            <p>Tìm theo tên, mã món, nhóm món và trạng thái phục vụ.</p>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchMenu({
                keyword: filters.keyword,
                category: filters.category,
                available: filters.available
              });
            }}
          >
            <div className="col-md-5">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhập mã món, tên món hoặc loại"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
              <div className="table-subtext">
                {isDebouncingText ? "Đang cập nhật bộ lọc..." : "Tìm kiếm tự động sau 0.4 giây khi dừng gõ."}
              </div>
            </div>

            <div className="col-md-3">
              <input
                type="text"
                name="category"
                className="form-control"
                placeholder="Lọc theo loại"
                value={filters.category}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-md-2">
              <select
                name="available"
                className="form-select"
                value={filters.available}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả</option>
                <option value="true">Đang bán</option>
                <option value="false">Tạm ẩn</option>
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
                  <strong>{sortedMenu.length} món ăn</strong>
                  <span>Sắp xếp theo tên, giá, loại món và chia trang để bảng menu dễ demo hơn khi dữ liệu tăng.</span>
                </div>

                <div className="table-controls-inline">
                  <label className="inline-field">
                    <span>Sắp xếp</span>
                    <select className="form-select mini-select" value={sortBy} onChange={handleSortChange}>
                      <option value="latest">Mới cập nhật</option>
                      <option value="name_asc">Tên A-Z</option>
                      <option value="name_desc">Tên Z-A</option>
                      <option value="price_asc">Giá thấp đến cao</option>
                      <option value="price_desc">Giá cao đến thấp</option>
                      <option value="category">Loại món</option>
                      <option value="available">Đang bán trước</option>
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
              <h3>{editingItemId ? "Cập nhật món ăn" : "Thêm món ăn"}</h3>
              <p>Admin có thể chỉnh sửa giá, mô tả, ảnh và trạng thái phục vụ ngay trên form này.</p>
            </div>

            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-md-4">
                <input
                  type="text"
                  name="category"
                  className="form-control"
                  placeholder="Loại món"
                  value={formData.category}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <input
                  type="text"
                  name="item_name"
                  className="form-control"
                  placeholder="Tên món"
                  value={formData.item_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <input
                  type="number"
                  min="1"
                  name="price"
                  className="form-control"
                  placeholder="Giá"
                  value={formData.price}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="col-md-8">
                <input
                  type="text"
                  name="description"
                  className="form-control"
                  placeholder="Mô tả món ăn"
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-md-4">
                <select
                  name="is_available"
                  className="form-select"
                  value={formData.is_available}
                  onChange={handleFormChange}
                >
                  <option value="1">Đang bán</option>
                  <option value="0">Tạm ẩn</option>
                </select>
              </div>

              <div className="col-12">
                <input
                  type="text"
                  name="image_url"
                  className="form-control"
                  placeholder="Link hình ảnh món ăn"
                  value={formData.image_url}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-md-6 d-grid">
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Đang lưu..." : editingItemId ? "Cập nhật món" : "Thêm món"}
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
              <p>Tài khoản staff chỉ có quyền xem danh sách món ăn. Thêm, sửa, xóa thuộc role admin.</p>
            </div>

            <div className="soft-banner">
              <strong>Chế độ chỉ xem</strong>
              <span>Bạn vẫn có thể tìm, lọc và đối chiếu giá món khi tiếp nhận order.</span>
            </div>
          </div>
        )}
      </div>

      <div className="content-card stack-card">
        <div className="table-toolbar">
          <div className="section-heading">
            <h3>Danh sách món ăn</h3>
            <p>Bảng menu đã có sắp xếp và chia trang để bạn có thể demo nhanh ngay cả khi số món ăn tăng lên.</p>
          </div>

          <div className="table-toolbar-meta align-end">
            <strong>
              {visibleStart}-{visibleEnd} / {sortedMenu.length}
            </strong>
            <span>Trang {safeCurrentPage}/{totalPages}</span>
          </div>
        </div>

        {loading ? (
          <div className="screen-state" style={{ minHeight: 220 }}>
            Đang tải menu...
          </div>
        ) : (
          <div className="table-shell">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Mã món</th>
                  <th>Tên món</th>
                  <th>Loại</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th>Mô tả</th>
                  {canManage ? <th></th> : null}
                </tr>
              </thead>

              <tbody>
                {paginatedMenu.length ? (
                  paginatedMenu.map((item) => (
                    <tr key={item.item_id} className={editingItemId === item.item_id ? "table-row-active" : ""}>
                      <td>{item.item_code}</td>
                      <td>
                        <strong>{item.item_name}</strong>
                        <div className="table-subtext">{item.image_url || "Không có link hình ảnh"}</div>
                      </td>
                      <td>{item.category}</td>
                      <td>{Number(item.price).toLocaleString("vi-VN")} VND</td>
                      <td>
                        <span className={`status-pill ${item.is_available ? "status-active" : "status-inactive"}`}>
                          {item.is_available ? "đang_bán" : "tạm_ẩn"}
                        </span>
                      </td>
                      <td>{item.description || "--"}</td>
                      {canManage ? (
                        <td className="action-cell">
                          <button type="button" className="ghost-button button-sm" onClick={() => startEditing(item)}>
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="ghost-button button-sm danger-button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.item_id}
                          >
                            {deletingId === item.item_id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManage ? "7" : "6"} className="text-center py-4">
                      Chưa có dữ liệu món ăn.
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
            <span>Đổi số dòng trên mỗi trang khi bạn muốn demo menu ngắn hơn hoặc đầy đủ hơn.</span>
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

export default MenuManager;
