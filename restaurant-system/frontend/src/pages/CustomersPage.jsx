import React from "react";
import CustomerManager from "../components/CustomerManager";

function CustomersPage() {
  return (
    <section className="content-card">
      <div className="page-heading">
        <div>
          <h1>Quan ly khach hang</h1>
          <p>Frontend da noi CRUD khach hang voi backend. Nhan vien va admin deu co the tim, them, sua, xoa.</p>
        </div>
      </div>

      <CustomerManager />
    </section>
  );
}

export default CustomersPage;
