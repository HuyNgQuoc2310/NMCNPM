import React from "react";
import EmployeeManager from "../components/EmployeeManager";

function EmployeesPage() {
  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Admin workspace</span>
            <h1 className="page-intro-title">Quản lý nhân viên</h1>
            <p className="page-intro-copy">
              Chỉ admin mới có quyền.
            </p>
          </div>
          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Truy cập</span>
              <strong>Admin only</strong>
              <small>Staff không thấy route này trong sidebar và bị chặn ở backend.</small>
            </article>

            <article className="page-mini-card">
              <span>Trung tâm</span>
              <strong>Bảo mật + quyền hạn</strong>
              <small>Thay đổi quyền hạn, mật khẩu và trạng thái tài khoản ngay trên bảng dữ liệu.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div>
            <h3>Trung tâm</h3>
            <p>Màn này cần gọn nhưng chắc, vì đây là nơi admin thao tác với tài khoản và quyền hạn nhạy cảm nhất.</p>
          </div>

          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Quyền hạn</strong>
              <span>Admin có thể tạo tài khoản staff mới hoặc nâng quyền admin theo nghiệp vụ.</span>
            </article>

            <article className="page-side-item">
              <strong>An toàn thao tác</strong>
              <span>Đã chặn xóa chính mình và khóa quyền hạn khi sửa tài khoản đang đăng nhập.</span>
            </article>
          </div>
        </aside>
      </div>

      <EmployeeManager />
    </section>
  );
}

export default EmployeesPage;
