import React from "react";
import CustomerManager from "../components/CustomerManager";

function CustomersPage() {
  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card card--larged">
          <div>
            <span className="page-kicker">Customer workspace</span>
            <h1 className="page-intro-title">Quản lý khách hàng</h1>
            <p className="page-intro-copy">
              Nhân viên và admin đều có thể tìm, thêm, sửa, xóa.
            </p>
          </div>

          <div className="page-mini-grid">
            <article className="page-mini-card">
              <span>Truy cập chung</span>
              <strong>Admin + staff</strong>
              <small>Danh sách phục vụ trực tiếp cho đặt bàn và lịch sử phục vụ.</small>
            </article>

            <article className="page-mini-card">
              <span>Hiển thị</span>
              <strong>Tùy chỉnh</strong>
              <small>Thêm sửa xóa dữ liệu cập nhật vào bảng dữ liệu.</small>
            </article>
          </div>
        </article>
      </div>
      
      <CustomerManager />
    </section>
  );
}

export default CustomersPage;
