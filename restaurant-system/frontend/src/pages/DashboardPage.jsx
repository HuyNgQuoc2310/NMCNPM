import React from "react";
import { useAuth } from "../context/useAuth";

const statsByRole = {
  admin: [
    {
      label: "Quyen hien tai",
      value: "ADMIN",
      description: "Quan tri du lieu goc, tai khoan va cau hinh van hanh."
    },
    {
      label: "Trang thai auth",
      value: "JWT",
      description: "Moi API backend hien da duoc bao ve bang token dang nhap."
    },
    {
      label: "Trang thai layout",
      value: "ROLE UI",
      description: "Menu ben trai tu dong an hien theo admin hoac staff."
    }
  ],
  staff: [
    {
      label: "Quyen hien tai",
      value: "STAFF",
      description: "Tiep nhan dat ban, check-in, phuc vu order va thanh toan."
    },
    {
      label: "Tai khoan dang dung",
      value: "OPERATE",
      description: "Chi thay cac module phuc vu van hanh, khong thay khu quan tri."
    },
    {
      label: "Trang thai auth",
      value: "SECURED",
      description: "Neu token het han, frontend se bat dang nhap lai."
    }
  ]
};

function DashboardPage() {
  const { role, user } = useAuth();
  const stats = statsByRole[role] || statsByRole.staff;

  return (
    <section className="workspace-grid">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Xin chao {user?.full_name || user?.username}, he thong da chay theo role {role}.</h1>
          <p>
            Frontend da noi voi login JWT, route protection va role-based navigation. Tu day ban co the demo luong vao
            he thong bang admin hoac staff ma khong can doi backend nua.
          </p>
        </div>

        <div className="stat-grid">
          {stats.map((item) => (
            <article className="stat-card module-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="module-grid">
        <article className="module-card">
          <span className="module-kicker">Da xong</span>
          <h3>Login + role</h3>
          <p>Dang nhap xong se lay token, goi profile va render menu dung voi quyen nguoi dung.</p>
        </article>

        <article className="module-card">
          <span className="module-kicker">Menu hien co</span>
          <h3>Quan ly menu va ban an</h3>
          <p>Admin thay form them du lieu, staff chi xem bang du lieu da duoc backend bao ve.</p>
        </article>

        <article className="module-card">
          <span className="module-kicker">Moi noi frontend</span>
          <h3>Dat ban, goi mon, thanh toan</h3>
          <p>Reservations, sessions va payments da co man hinh de demo end-to-end voi API hien tai.</p>
        </article>
      </div>
    </section>
  );
}

export default DashboardPage;
