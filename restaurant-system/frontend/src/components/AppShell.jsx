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
    roles: ["admin", "staff"]
  },
  {
    to: "/tables",
    label: "Bàn ăn",
    description: "Sức chứa, trạng thái và bố trí bàn.",
    roles: ["admin", "staff"]
  },
  {
    to: "/customers",
    label: "Khách hàng",
    description: "Thông tin khách hàng phục vụ đặt bàn.",
    roles: ["admin", "staff"]
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
    to: "/reports",
    label: "Báo cáo",
    description: "Thống kê món ăn, khung giờ và doanh thu.",
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

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="eyebrow">Restaurant System</span>
          <h1>Nhà hàng Phố Bàn</h1>
          <p>
            Giao diện đã nối với login, token và role. Staff thấy menu phục vụ, admin thấy thêm khu quản trị.
          </p>
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
            <h2>{currentItem?.label || "Hệ thống quản lý nhà hàng"}</h2>
            <p>Đang đăng nhập với tài khoản {user?.username}. Menu và route hiện tại đang phân theo role.</p>
          </div>

          <div className="topbar-actions">
            <span className="role-badge">{user?.role}</span>
            <button type="button" className="ghost-button" onClick={logout}>
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
