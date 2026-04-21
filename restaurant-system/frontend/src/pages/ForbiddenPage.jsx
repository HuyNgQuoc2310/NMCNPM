import React from "react";
import { Link } from "react-router-dom";

function ForbiddenPage() {
  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">403</span>
            <h1 className="page-intro-title">Bạn không có quyền vào khu vực này.</h1>
            <p className="page-intro-copy">
              Role hiện tại không phù hợp với route được yêu cầu. Quay lại dashboard hoặc đăng nhập bằng tài khoản
              khác.
            </p>
          </div>

          <div>
            <Link to="/" className="primary-button" style={{ display: "inline-flex", textDecoration: "none" }}>
              Về dashboard
            </Link>
          </div>
        </article>

        <aside className="page-side-card">
          <div>
            <h3>Vì sao bị chặn</h3>
            <p>Frontend và backend đang cùng dùng phân quyền theo role, nên route nhạy cảm sẽ bị khóa đồng bộ.</p>
          </div>

          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Staff</strong>
              <span>Không vào được khu nhân viên và báo cáo.</span>
            </article>

            <article className="page-side-item">
              <strong>Admin</strong>
              <span>Có thêm menu quản trị và toàn bộ route báo cáo.</span>
            </article>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ForbiddenPage;
