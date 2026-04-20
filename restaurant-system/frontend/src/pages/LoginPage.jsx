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
          <h1 className="login-title">Dang nhap theo role de van hanh dung quyen.</h1>
          <p className="login-copy">
            Admin duoc quan tri menu, ban an va nhan vien. Staff chi nhin thay cong viec van hanh nha hang va cac man
            hinh phuc vu.
          </p>
        </div>

        <div className="login-notes">
          <article className="note-card">
            <h3>Role admin</h3>
            <p>Quan ly du lieu goc, tai khoan nhan vien va cac khu vuc quan tri he thong.</p>
          </article>

          <article className="note-card">
            <h3>Role staff</h3>
            <p>Xu ly khach hang, dat ban, phuc vu order va thanh toan theo luong van hanh.</p>
          </article>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Dang nhap he thong</h2>
          <p>Su dung tai khoan da seed trong MySQL de vao dung giao dien theo quyen.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-stack">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="Nhap username"
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
                placeholder="Nhap password"
              />
            </div>

            {error ? <div className="alert-message alert-error">{error}</div> : null}

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Dang dang nhap..." : "Dang nhap"}
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
                Dung mau nay
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
                Dung mau nay
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
