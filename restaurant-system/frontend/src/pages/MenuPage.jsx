import React from "react";
import MenuManager from "../components/MenuManager";
import { useAuth } from "../context/useAuth";

function MenuPage() {
  const { role } = useAuth();

  return (
    <section className="content-card">
      <div className="page-heading">
        <div>
          <h1>Quan ly mon an</h1>
          <p>Da noi CRUD day du cho mon an. Staff chi xem va loc, admin co them, sua, xoa va cap nhat trang thai.</p>
        </div>
      </div>

      <MenuManager canManage={role === "admin"} />
    </section>
  );
}

export default MenuPage;
