import React from "react";
import CustomerManager from "../components/CustomerManager";
import { useAuth } from "../context/useAuth";

function CustomersPage() {
  const { role } = useAuth();

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Customer workspace</span>
            <h1 className="page-intro-title customers-page-title">Quản lý khách hàng</h1>
          </div>

          <div className="page-mini-grid customers-mini-grid">
            <article className="page-mini-card customers-mini-card">
              <span>Truy cập</span>
              <strong>Admin + staff</strong>
              <small>Cả hai vai trò đều có thể thao tác trực tiếp với dữ liệu khách hàng.</small>
            </article>

            <article className="page-mini-card customers-mini-card">
              <span>Role hiện tại</span>
              <strong>{role}</strong>
              <small>Quyền của màn này không bị tách riêng giữa admin và staff như màn nhân viên.</small>
            </article>

            <article className="page-mini-card customers-mini-card">
              <span>Tác vụ chính</span>
              <strong>Tìm + CRUD</strong>
              <small>Thêm, sửa, xóa và tìm kiếm đều phản ánh ngay vào bảng dữ liệu bên dưới.</small>
            </article>
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Dùng chung cho đặt bàn</strong>
              <span>Tên, số điện thoại và địa chỉ khách có thể được chọn lại nhanh khi tạo phiếu đặt mới.</span>
            </article>

            <article className="page-side-item">
              <strong>Cập nhật trực tiếp</strong>
              <span>Thêm, sửa, xóa xong là dữ liệu trên bảng đổi ngay, phù hợp để demo thao tác nghiệp vụ.</span>
            </article>

            <article className="page-side-item">
              <strong>Dễ tra cứu</strong>
              <span>Danh sách đã có tìm kiếm, sắp xếp và phân trang để xử lý tốt khi số lượng khách tăng lên.</span>
            </article>
          </div>
        </aside>
      </div>

      <CustomerManager />
    </section>
  );
}

export default CustomersPage;
