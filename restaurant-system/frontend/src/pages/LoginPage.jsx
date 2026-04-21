import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: "admin",
    password: "Admin@123"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    setCredentials((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      const user = await login(credentials);
      const nextPath = location.state?.from?.pathname || (user.role === "admin" ? "/employees" : "/");
      navigate(nextPath, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-side">
        <div className="login-brand">
          <span className="eyebrow">Auth + Role</span>
          <h1 className="login-title">Đăng nhập theo role để vận hành đúng quyền.</h1>
          <p className="login-copy">
            Admin được quản trị menu, bàn ăn và nhân viên. Staff chỉ nhìn thấy công việc vận hành nhà hàng và các màn
            hình phục vụ.
          </p>
        </div>

        <div className="login-notes">
          <article className="note-card">
            <h3>Role admin</h3>
            <p>Quản lý dữ liệu gốc, tài khoản nhân viên và các khu vực quản trị hệ thống.</p>
          </article>

          <article className="note-card">
            <h3>Role staff</h3>
            <p>Xử lý khách hàng, đặt bàn, phục vụ order và thanh toán theo luồng vận hành.</p>
          </article>

          <article className="note-card">
            <h3>Role reports</h3>
            <p>Admin có thêm khu báo cáo để xem món ăn bán chạy, khung giờ và doanh thu theo tháng.</p>
          </article>
        </div>

        <div className="login-metrics">
          <article className="login-metric">
            <span>Auth</span>
            <strong>JWT secured</strong>
            <small>Frontend và backend đã đồng bộ token đăng nhập.</small>
          </article>

          <article className="login-metric">
            <span>Workspace</span>
            <strong>Role-based UI</strong>
            <small>Menu và route sẽ tự động đổi theo admin hoặc staff.</small>
          </article>

          <article className="login-metric">
            <span>Demo</span>
            <strong>End-to-end</strong>
            <small>Có thể đi từ đặt bàn đến thanh toán và báo cáo trong cùng app.</small>
          </article>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Đăng nhập hệ thống</h2>
          <p>Sử dụng tài khoản đã seed trong MySQL để vào đúng giao diện theo quyền.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-stack">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="Nhập username"
              />
            </div>

            <div className="field-stack">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Nhập password"
              />
            </div>

            {error ? <div className="alert-message alert-error">{error}</div> : null}

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="login-help">
            <div className="credential-chip">
              <div>
                <strong>admin</strong>
                <span>Admin@123</span>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCredentials({ username: "admin", password: "Admin@123" })}
              >
                Dùng mẫu này
              </button>
            </div>

            <div className="credential-chip">
              <div>
                <strong>staff01</strong>
                <span>Staff@123</span>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCredentials({ username: "staff01", password: "Staff@123" })}
              >
                Dùng mẫu này
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
