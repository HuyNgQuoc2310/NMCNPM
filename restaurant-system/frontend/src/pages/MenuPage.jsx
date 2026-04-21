import React from "react";
import MenuManager from "../components/MenuManager";
import { useAuth } from "../context/useAuth";

function MenuPage() {
  const { role } = useAuth();

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Menu workspace</span>
            <h1 className="page-intro-title">Quản lý món ăn</h1>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Role hiện tại</span>
              <strong>{role}</strong>
              <small>Quyền thao tác trên bảng menu sẽ đổi theo role đang đăng nhập.</small>
            </article>

            <article className="page-mini-card">
              <span>Flow</span>
              <strong>CRUD + filter</strong>
              <small>Hỗ trợ tìm, sắp xếp và chia trang cho danh sách menu lớn.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Admin</strong>
              <span>Có thể thêm, sửa, xóa, cập nhật giá và trạng thái phục vụ của món ăn.</span>
            </article>

            <article className="page-side-item">
              <strong>Staff</strong>
              <span>Chỉ xem danh sách, lọc nhanh và đối chiếu giá khi nhập món cho khách.</span>
            </article>
          </div>
        </aside>
      </div>

      <MenuManager canManage={role === "admin"} />
    </section>
  );
}

export default MenuPage;
