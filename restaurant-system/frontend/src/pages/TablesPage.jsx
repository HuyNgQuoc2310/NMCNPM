import React from "react";
import TableManager from "../components/TableManager";
import { useAuth } from "../context/useAuth";

function TablesPage() {
  const { role } = useAuth();

  return (
    <section className="content-card">
      <div className="page-heading">
        <div>
          <h1>Quan ly ban an</h1>
          <p>Da noi CRUD day du cho ban an. Staff chi xem va loc, admin co them, sua, xoa, doi suc chua va trang thai.</p>
        </div>
      </div>

      <TableManager canManage={role === "admin"} />
    </section>
  );
}

export default TablesPage;
