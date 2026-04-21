import React from "react";
import { useAuth } from "../context/useAuth";

const statsByRole = {
  admin: [
    {
      label: "Quyền hiện tại",
      value: "ADMIN",
      description: "Quản trị dữ liệu gốc, tài khoản và cấu hình vận hành."
    },
    {
      label: "Trạng thái auth",
      value: "JWT",
      description: "Mọi API backend hiện đã được bảo vệ bằng token đăng nhập."
    },
    {
      label: "Trạng thái layout",
      value: "ROLE UI",
      description: "Menu bên trái tự động ẩn hiện theo admin hoặc staff."
    }
  ],
  staff: [
    {
      label: "Quyền hiện tại",
      value: "STAFF",
      description: "Tiếp nhận đặt bàn, check-in, phục vụ order và thanh toán."
    },
    {
      label: "Tài khoản đang dùng",
      value: "OPERATE",
      description: "Chỉ thấy các module phục vụ vận hành, không thấy khu quản trị."
    },
    {
      label: "Trạng thái auth",
      value: "SECURED",
      description: "Nếu token hết hạn, frontend sẽ bắt đăng nhập lại."
    }
  ]
};

const modulesByRole = {
  admin: [
    {
      label: "Vận hành",
      title: "Đặt bàn và phục vụ",
      description: "Theo dõi luồng nhận đặt bàn, check-in, gọi món và thanh toán ngay trên cùng hệ thống."
    },
    {
      label: "Quản trị",
      title: "Dữ liệu gốc",
      description: "Quản lý món ăn, bàn ăn, khách hàng và tài khoản nhân viên theo quyền admin."
    },
    {
      label: "Báo cáo",
      title: "Phân tích doanh thu",
      description: "Xem món bán chạy, lượng khách theo khung giờ và doanh thu theo tháng để chốt demo."
    }
  ],
  staff: [
    {
      label: "Đặt bàn",
      title: "Tiếp nhận khách",
      description: "Tìm bàn trống, chọn khách hàng và xác nhận phiếu đặt nhanh cho ca phục vụ."
    },
    {
      label: "Phục vụ",
      title: "Mở phiên và gọi món",
      description: "Check-in khách, mở phiên phục vụ, tạo order và thêm món ngay theo từng bàn."
    },
    {
      label: "Thanh toán",
      title: "Chốt hóa đơn",
      description: "Theo dõi các session đang mở và xử lý thanh toán nhanh theo bàn hoặc khách."
    }
  ]
};

function DashboardPage() {
  const { role, user } = useAuth();
  const stats = statsByRole[role] || statsByRole.staff;
  const modules = modulesByRole[role] || modulesByRole.staff;

  return (
    <section className="page-shell">
      <div className="page-intro-grid">
        <article className="page-intro-card">
          <div>
            <span className="page-kicker">Workspace</span>
            <h1 className="page-intro-title">Xin chào {user?.full_name || user?.username}.</h1>
          </div>

          <div className="page-mini-grid dashboard-mini-grid">
            {stats.map((item) => (
              <article className="page-mini-card dashboard-mini-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.description}</small>
              </article>
            ))}
          </div>
        </article>

        <aside className="page-side-card">
          <div className="page-side-list">
            <article className="page-side-item">
              <strong>Luồng vận hành</strong>
              <span>Đặt bàn, check-in, gọi món và thanh toán.</span>
            </article>

            <article className="page-side-item">
              <strong>Khu quản trị</strong>
              <span>Admin có thêm, sửa, và xóa món ăn, bàn ăn, nhân viên và khu báo cáo riêng.</span>
            </article>

            <article className="page-side-item">
              <strong>Phân quyền</strong>
              <span>Staff chỉ thấy các màn phục vụ, không vào được khu quản trị hay báo cáo.</span>
            </article>
          </div>
        </aside>
      </div>

      <div className="module-grid">
        {modules.map((item) => (
          <article className="stat-card module-card" key={item.title}>
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

     
    </section>
  );
}

export default DashboardPage;
