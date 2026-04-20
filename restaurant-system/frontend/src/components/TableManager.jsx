import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
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

function TableManager({ canManage }) {
  const { logout, token } = useAuth();
  const [tables, setTables] = useState([]);
  const [filters, setFilters] = useState(initialTableFilters);
  const [formData, setFormData] = useState(initialTableForm);
  const [editingTableId, setEditingTableId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  function handleAuthError(error) {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }

  function buildQuery(nextFilters = filters) {
    const params = new URLSearchParams();

    if (nextFilters.keyword.trim()) {
      params.set("keyword", nextFilters.keyword.trim());
    }

    if (nextFilters.status) {
      params.set("status", nextFilters.status);
    }

    return params.toString();
  }

  async function fetchTables(nextFilters = filters) {
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
  }

  useEffect(() => {
    let ignore = false;

    async function bootstrapTables() {
      try {
        const data = await apiFetch("/tables", { token });

        if (!ignore) {
          setTables(data);
        }
      } catch (error) {
        if (!ignore && error.status === 401) {
          logout();
          return;
        }

        if (!ignore) {
          setFeedback({ type: "error", message: error.message });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void bootstrapTables();

    return () => {
      ignore = true;
    };
  }, [logout, token]);

  function resetForm() {
    setEditingTableId(null);
    setFormData(initialTableForm);
  }

  function handleFilterChange(event) {
    setFilters((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
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
        message: editingTableId ? "Da cap nhat ban an." : "Da them ban an moi."
      });
      resetForm();
      await fetchTables();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(table) {
    const confirmed = window.confirm(`Xoa ban ${table.table_name}?`);
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

      setFeedback({ type: "success", message: "Da xoa ban an." });
      await fetchTables();
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
        <div className="panel-card stack-card">
          <div className="section-heading">
            <h3>Bo loc ban an</h3>
            <p>Tim theo ten ban, ma ban, mo ta hoac loc nhanh theo trang thai van hanh.</p>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchTables();
            }}
          >
            <div className="col-md-8">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhap ma ban, ten ban hoac mo ta"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-md-2">
              <select
                name="status"
                className="form-select"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">Tat ca</option>
                <option value="available">available</option>
                <option value="reserved">reserved</option>
                <option value="occupied">occupied</option>
                <option value="unavailable">unavailable</option>
              </select>
            </div>

            <div className="col-md-2 d-grid">
              <button type="submit" className="ghost-button">
                Loc
              </button>
            </div>
          </form>
        </div>

        {canManage ? (
          <div className="panel-card stack-card">
            <div className="section-heading">
              <h3>{editingTableId ? "Cap nhat ban an" : "Them ban an"}</h3>
              <p>Admin co the doi suc chua, trang thai, mo ta va mo/khoa ban ngay tren form nay.</p>
            </div>

            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-md-5">
                <input
                  type="text"
                  name="table_name"
                  className="form-control"
                  placeholder="Ten ban"
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
                  placeholder="Suc chua"
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
                  placeholder="Mo ta ban"
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
                  <option value="1">Dang mo</option>
                  <option value="0">Tam khoa</option>
                </select>
              </div>

              <div className="col-md-6 d-grid">
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Dang luu..." : editingTableId ? "Cap nhat ban" : "Them ban"}
                </button>
              </div>

              <div className="col-md-6 d-grid">
                <button type="button" className="ghost-button" onClick={resetForm} disabled={submitting}>
                  Bo form
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="panel-card stack-card">
            <div className="section-heading">
              <h3>Quyen staff</h3>
              <p>Tai khoan staff chi duoc xem thong tin ban, suc chua va trang thai phuc vu.</p>
            </div>

            <div className="soft-banner">
              <strong>Che do chi xem</strong>
              <span>Ban van co the loc nhanh de tim ban phu hop khi tiep nhan dat ban hoac check-in.</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="screen-state" style={{ minHeight: 220 }}>
          Dang tai danh sach ban...
        </div>
      ) : (
        <div className="table-shell">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Ma ban</th>
                <th>Ten ban</th>
                <th>Suc chua</th>
                <th>Trang thai</th>
                <th>Mo/khoa</th>
                <th>Mo ta</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>

            <tbody>
              {tables.length ? (
                tables.map((table) => (
                  <tr key={table.table_id}>
                    <td>{table.table_code}</td>
                    <td>{table.table_name}</td>
                    <td>{table.capacity} khach</td>
                    <td>
                      <span className={`status-pill status-${table.status}`}>{table.status}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${table.is_active ? "status-active" : "status-inactive"}`}>
                        {table.is_active ? "dang_mo" : "tam_khoa"}
                      </span>
                    </td>
                    <td>{table.description || "--"}</td>
                    {canManage ? (
                      <td className="action-cell">
                        <button type="button" className="ghost-button button-sm" onClick={() => startEditing(table)}>
                          Sua
                        </button>
                        <button
                          type="button"
                          className="ghost-button button-sm danger-button"
                          onClick={() => handleDelete(table)}
                          disabled={deletingId === table.table_id}
                        >
                          {deletingId === table.table_id ? "Dang xoa..." : "Xoa"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canManage ? "7" : "6"} className="text-center py-4">
                    Chua co du lieu ban an.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TableManager;
