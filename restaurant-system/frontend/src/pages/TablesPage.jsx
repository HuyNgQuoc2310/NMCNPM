import React from "react";
import TableManager from "../components/TableManager";
import { useAuth } from "../context/useAuth";

function TablesPage() {
  const { role } = useAuth();

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Table workspace</span>
            <h1 className="page-intro-title">Quản lý bàn ăn</h1>
            <p className="page-intro-copy">
              Đã nối CRUD đầy đủ cho bàn ăn. Staff chỉ xem và lọc, admin có thêm, sửa, xóa, đổi sức chứa và trạng thái.
            </p>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Role hiện tại</span>
              <strong>{role}</strong>
              <small>Quyền cập nhật sức chứa, mở khóa và trạng thái chỉ mở cho admin.</small>
            </article>

            <article className="page-mini-card">
              <span>Flow</span>
              <strong>Capacity + status</strong>
              <small>Danh sách đã có sort và pagination để demo khi nhà hàng nhiều bàn hơn.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div>
            <h3>Trọng tâm demo</h3>
            <p>Màn này nên demo cùng `Đặt bàn` để thấy được mối liên kết giữa sức chứa, trạng thái và vận hành.</p>
          </div>

          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Admin</strong>
              <span>Cập nhật trực tiếp tên bàn, sức chứa, mô tả và khả dụng.</span>
            </article>

            <article className="page-side-item">
              <strong>Staff</strong>
              <span>Tìm nhanh bàn phù hợp để nhận đặt bàn hoặc mở phiên vãng lai.</span>
            </article>
          </div>
        </aside>
      </div>

      <TableManager canManage={role === "admin"} />
    </section>
  );
}

export default TablesPage;
