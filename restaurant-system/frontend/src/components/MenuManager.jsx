import React, { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
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

function MenuManager({ canManage }) {
  const { logout, token } = useAuth();
  const [menu, setMenu] = useState([]);
  const [filters, setFilters] = useState(initialMenuFilters);
  const [formData, setFormData] = useState(initialMenuForm);
  const [editingItemId, setEditingItemId] = useState(null);
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

    if (nextFilters.category.trim()) {
      params.set("category", nextFilters.category.trim());
    }

    if (nextFilters.available !== "") {
      params.set("available", nextFilters.available);
    }

    return params.toString();
  }

  async function fetchMenu(nextFilters = filters) {
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
  }

  useEffect(() => {
    let ignore = false;

    async function bootstrapMenu() {
      try {
        const data = await apiFetch("/menu", { token });

        if (!ignore) {
          setMenu(data);
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

    void bootstrapMenu();

    return () => {
      ignore = true;
    };
  }, [logout, token]);

  function resetForm() {
    setEditingItemId(null);
    setFormData(initialMenuForm);
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
        message: editingItemId ? "Da cap nhat mon an." : "Da them mon an moi."
      });
      resetForm();
      await fetchMenu();
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Xoa mon ${item.item_name}?`);
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

      setFeedback({ type: "success", message: "Da xoa mon an." });
      await fetchMenu();
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
            <h3>Bo loc menu</h3>
            <p>Tim theo ten, ma mon, nhom mon va trang thai phuc vu.</p>
          </div>

          <form
            className="row g-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchMenu();
            }}
          >
            <div className="col-md-5">
              <input
                type="text"
                name="keyword"
                className="form-control"
                placeholder="Nhap ma mon, ten mon hoac loai"
                value={filters.keyword}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-md-3">
              <input
                type="text"
                name="category"
                className="form-control"
                placeholder="Loc theo loai"
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
                <option value="">Tat ca</option>
                <option value="true">Dang ban</option>
                <option value="false">Tam an</option>
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
              <h3>{editingItemId ? "Cap nhat mon an" : "Them mon an"}</h3>
              <p>Admin co the chinh sua gia, mo ta, anh va trang thai phuc vu ngay tren form nay.</p>
            </div>

            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-md-4">
                <input
                  type="text"
                  name="category"
                  className="form-control"
                  placeholder="Loai mon"
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
                  placeholder="Ten mon"
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
                  placeholder="Gia"
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
                  placeholder="Mo ta mon an"
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
                  <option value="1">Dang ban</option>
                  <option value="0">Tam an</option>
                </select>
              </div>

              <div className="col-12">
                <input
                  type="text"
                  name="image_url"
                  className="form-control"
                  placeholder="Link hinh anh mon an"
                  value={formData.image_url}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-md-6 d-grid">
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Dang luu..." : editingItemId ? "Cap nhat mon" : "Them mon"}
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
              <p>Tai khoan staff chi co quyen xem danh sach mon an. Them, sua, xoa thuoc role admin.</p>
            </div>

            <div className="soft-banner">
              <strong>Che do chi xem</strong>
              <span>Ban van co the tim, loc va doi chieu gia mon khi tiep nhan order.</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="screen-state" style={{ minHeight: 220 }}>
          Dang tai menu...
        </div>
      ) : (
        <div className="table-shell">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Ma mon</th>
                <th>Ten mon</th>
                <th>Loai</th>
                <th>Gia</th>
                <th>Trang thai</th>
                <th>Mo ta</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>

            <tbody>
              {menu.length ? (
                menu.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_code}</td>
                    <td>
                      <strong>{item.item_name}</strong>
                      <div className="table-subtext">{item.image_url || "Khong co link hinh anh"}</div>
                    </td>
                    <td>{item.category}</td>
                    <td>{Number(item.price).toLocaleString("vi-VN")} VND</td>
                    <td>
                      <span className={`status-pill ${item.is_available ? "status-active" : "status-inactive"}`}>
                        {item.is_available ? "dang_ban" : "tam_an"}
                      </span>
                    </td>
                    <td>{item.description || "--"}</td>
                    {canManage ? (
                      <td className="action-cell">
                        <button type="button" className="ghost-button button-sm" onClick={() => startEditing(item)}>
                          Sua
                        </button>
                        <button
                          type="button"
                          className="ghost-button button-sm danger-button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.item_id}
                        >
                          {deletingId === item.item_id ? "Dang xoa..." : "Xoa"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canManage ? "7" : "6"} className="text-center py-4">
                    Chua co du lieu mon an.
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

export default MenuManager;
