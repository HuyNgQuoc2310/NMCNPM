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
    description: "ìm bàn trong và tiếp nhận phiếu đặt.",
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
    description: "Thu tiền va đóng bàn.",
    roles: ["admin", "staff"]
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
          <h1>Nha hang Pho Ban</h1>
          <p>
            Giao dien da noi voi login, token va role. Staff thay menu phuc vu, admin thay them khu quan tri.
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
            <h2>{currentItem?.label || "He thong quan ly nha hang"}</h2>
            <p>Dang dang nhap voi tai khoan {user?.username}. Menu va route hien tai dang phan theo role.</p>
          </div>

          <div className="topbar-actions">
            <span className="role-badge">{user?.role}</span>
            <button type="button" className="ghost-button" onClick={logout}>
              Dang xuat
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
