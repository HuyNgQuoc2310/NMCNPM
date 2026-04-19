import React from "react";
import MenuManager from "./components/MenuManager";
import TableManager from "./components/TableManager";

function App() {
  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="bg-dark text-white p-4"
        style={{ width: "260px", minHeight: "100vh" }}
      >
        <h3 className="text-center mb-4">Restaurant</h3>

        <ul className="nav flex-column">
          <li className="nav-link text-white">🍽 Quản lý món ăn</li>
          <li className="nav-link text-white">🪑 Quản lý bàn ăn</li>
          <li className="nav-link text-white">👤 Khách hàng</li>
          <li className="nav-link text-white">📅 Đặt bàn</li>
          <li className="nav-link text-white">💰 Thanh toán</li>
        </ul>
      </div>

      {/* Main content */}
      <div className="flex-grow-1 bg-light p-4">
        <h2 className="mb-4">Hệ thống quản lý nhà hàng</h2>

        <div className="card shadow rounded-4 p-4 mb-4">
          <MenuManager />
        </div>

        <div className="card shadow rounded-4 p-4">
          <TableManager />
        </div>
      </div>
    </div>
  );
}

export default App;