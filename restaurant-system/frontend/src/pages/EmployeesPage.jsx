import React from "react";
import EmployeeManager from "../components/EmployeeManager";

function EmployeesPage() {
  return (
    <section className="content-card">
      <div className="page-heading">
        <div>
          <h1>Quan ly nhan vien</h1>
          <p>Route nay chi danh cho admin. Ban co the tao tai khoan, phan role, khoa mo va cap nhat nhan vien.</p>
        </div>
      </div>

      <EmployeeManager />
    </section>
  );
}

export default EmployeesPage;
