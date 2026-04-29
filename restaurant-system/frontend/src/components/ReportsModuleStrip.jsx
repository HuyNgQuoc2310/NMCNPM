import React from "react";
import { NavLink } from "react-router-dom";

const reportModules = [
  {
    to: "/reports/best-selling-items",
    step: "Báo cáo 1",
    title: "Món ăn bán chạy",
    description: "Xem món bán mạnh theo số lượng và doanh thu."
  },
  {
    to: "/reports/hourly-guests",
    step: "Báo cáo 2",
    title: "Khách theo khung giờ",
    description: "Theo dõi lượng khách và doanh thu theo từng khung giờ."
  },
  {
    to: "/reports/monthly-revenue",
    step: "Báo cáo 3",
    title: "Doanh thu theo tháng",
    description: "Tổng hợp giao dịch và tổng thu theo từng tháng."
  }
];

function ReportsModuleStrip() {
  return (
    <div className="flow-strip">
      {reportModules.map((module) => (
        <NavLink
          key={module.to}
          to={module.to}
          className={({ isActive }) => `flow-step flow-step-link${isActive ? " active" : ""}`}
        >
          <span>{module.step}</span>
          <strong>{module.title}</strong>
          <small>{module.description}</small>
        </NavLink>
      ))}
    </div>
  );
}

export default ReportsModuleStrip;
