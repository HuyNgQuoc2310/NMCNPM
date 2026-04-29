import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const navigationItems = [
  {
    to: "/",
    label: "Bảng điều khiển",
    description: "Trang tổng hợp vai trò và tiến độ.",
    roles: ["admin", "staff"]
  },
  {
    to: "/menu",
    label: "Món ăn",
    description: "Danh sách và quản lý menu.",
    roles: ["admin"]
  },
  {
    to: "/tables",
    label: "Bàn ăn",
    description: "Sức chứa, trạng thái và bố trí bàn.",
    roles: ["admin"]
  },
  {
    to: "/customers",
    label: "Khách hàng",
    description: "Thông tin khách hàng phục vụ đặt bàn.",
    roles: ["admin"]
  },
  {
    to: "/reservations",
    label: "Đặt bàn",
    description: "Tìm bàn trống và tiếp nhận phiếu đặt.",
    roles: ["admin", "staff"]
  },
  {
    to: "/sessions",
    label: "Phiên phục vụ",
    description: "Check-in, gọi món và vận hành bàn.",
    roles: ["admin", "staff"]
  },
  {
    to: "/payments",
    label: "Thanh toán",
    description: "Thu tiền và đóng bàn.",
    roles: ["admin", "staff"]
  },
  {
    to: "/reports/best-selling-items",
    label: "Món ăn bán chạy",
    description: "Xếp hạng món theo số lượng bán và doanh thu.",
    roles: ["admin"]
  },
  {
    to: "/reports/hourly-guests",
    label: "Khách theo khung giờ",
    description: "Lượng khách, doanh thu và doanh thu đầu khách.",
    roles: ["admin"]
  },
  {
    to: "/reports/monthly-revenue",
    label: "Doanh thu theo tháng",
    description: "Theo dõi tổng thu và giao dịch theo từng tháng.",
    roles: ["admin"]
  },
  {
    to: "/employees",
    label: "Nhân viên",
    description: "Tài khoản, phân loại và quyền hệ thống.",
    roles: ["admin"]
  }
];

function AppShell() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const availableItems = navigationItems.filter((item) => item.roles.includes(user?.role));
  const currentItem = availableItems.find((item) => item.to === location.pathname);
  const isDashboardPage = location.pathname === "/";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <h1>HỆ THỐNG QUẢN LÍ ĐẶT BÀN VÀ GỌI MÓN TRONG MỘT NHÀ HÀNG</h1>
        </div>

        <nav className="sidebar-nav">
          {availableItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link-card${isActive ? " active" : ""}`}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-content">
        <header className="topbar">
          <div>
            <h2 className={isDashboardPage ? "topbar-title topbar-title-dashboard" : "topbar-title"}>
              {currentItem?.label || "Hệ thống quản lý nhà hàng"}
            </h2>
          </div>

          <div className="topbar-actions">
            <span className="role-badge topbar-role-chip">{user?.role}</span>
            <button type="button" className="ghost-button topbar-logout-button" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
