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
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Đăng nhập</span>
          <h2>Đăng nhập hệ thống</h2>
          <p>Nhập tài khoản để truy cập hệ thống quản lý nhà hàng.</p>

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
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
